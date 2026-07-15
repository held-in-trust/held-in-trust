#![no_std]

//! Base compliant token: a minimal balance/transfer token that checks every
//! transfer against zero or more dynamically registered compliance modules
//! before allowing it. Modules are separate deployed contracts implementing
//! a shared `is_transfer_allowed(from, to, amount) -> bool` interface,
//! called here via `env.invoke_contract` — this contract has no
//! compile-time dependency on any specific module, so new modules can be
//! registered without redeploying the token.
//!
//! Fails closed: if any registered module returns `false`, the transfer is
//! rejected. A module that panics aborts the whole transaction (Soroban's
//! standard cross-contract-call semantics), which is also fail-closed.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, vec, Address, Env, IntoVal,
    Symbol, Val, Vec,
};

#[contractevent]
pub struct MintEvent {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct TransferEvent {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct ModuleRegisteredEvent {
    #[topic]
    pub module: Address,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    InsufficientBalance = 4,
    RejectedByCompliance = 5,
}

#[contracttype]
enum DataKey {
    Admin,
    Balance(Address),
    Modules,
}

#[contract]
pub struct CompliantTokenContract;

#[contractimpl]
impl CompliantTokenContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Modules, &Vec::<Address>::new(&env));
        Ok(())
    }

    /// Admin-only: register a compliance-module contract. Every future
    /// transfer must be allowed by every registered module.
    pub fn register_module(env: Env, admin: Address, module: Address) -> Result<(), Error> {
        let stored_admin = Self::require_admin(&env, &admin)?;
        stored_admin.require_auth();

        let mut modules: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Modules)
            .unwrap_or(Vec::new(&env));
        modules.push_back(module.clone());
        env.storage().instance().set(&DataKey::Modules, &modules);
        ModuleRegisteredEvent { module }.publish(&env);
        Ok(())
    }

    /// Admin-only mint. Still subject to compliance checks on the recipient,
    /// since a mint is a transfer-in.
    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) -> Result<(), Error> {
        let stored_admin = Self::require_admin(&env, &admin)?;
        stored_admin.require_auth();

        if !Self::check_compliance(&env, &admin, &to, amount) {
            return Err(Error::RejectedByCompliance);
        }

        let balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(balance + amount));
        MintEvent { to, amount }.publish(&env);
        Ok(())
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }
        if !Self::check_compliance(&env, &from, &to, amount) {
            return Err(Error::RejectedByCompliance);
        }

        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        TransferEvent { from, to, amount }.publish(&env);
        Ok(())
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn modules(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Modules)
            .unwrap_or(Vec::new(&env))
    }

    fn require_admin(env: &Env, admin: &Address) -> Result<Address, Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if *admin != stored_admin {
            return Err(Error::NotAdmin);
        }
        Ok(stored_admin)
    }

    fn check_compliance(env: &Env, from: &Address, to: &Address, amount: i128) -> bool {
        let modules: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Modules)
            .unwrap_or(Vec::new(env));

        for module in modules.iter() {
            let args: Vec<Val> = vec![
                env,
                from.into_val(env),
                to.into_val(env),
                amount.into_val(env),
            ];
            let allowed: bool =
                env.invoke_contract(&module, &Symbol::new(env, "is_transfer_allowed"), args);
            if !allowed {
                return false;
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use held_in_trust_jurisdiction_allowlist::{
        JurisdictionAllowlistContract, JurisdictionAllowlistContractClient,
    };
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, CompliantTokenContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token_id = env.register(CompliantTokenContract, ());
        let token = CompliantTokenContractClient::new(&env, &token_id);
        token.initialize(&admin);
        (env, admin, token)
    }

    #[test]
    fn transfer_succeeds_with_no_modules_registered() {
        let (env, admin, token) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        token.mint(&admin, &alice, &1000);
        token.transfer(&alice, &bob, &300);

        assert_eq!(token.balance(&alice), 700);
        assert_eq!(token.balance(&bob), 300);
    }

    #[test]
    fn transfer_rejected_when_a_registered_module_disallows_it() {
        let (env, admin, token) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // Deploy and register a real jurisdiction_allowlist module contract —
        // a genuine cross-contract integration test, not a mock.
        let module_id = env.register(JurisdictionAllowlistContract, ());
        let module = JurisdictionAllowlistContractClient::new(&env, &module_id);
        module.initialize(&admin);
        token.register_module(&admin, &module_id);

        // Mint bypasses the module for `admin` itself (module never queried
        // for admin) but the recipient (alice) must still be allowed for the
        // mint's implicit transfer-in check.
        module.set_allowed(&admin, &admin, &true);
        module.set_allowed(&admin, &alice, &true);
        token.mint(&admin, &alice, &1000);
        assert_eq!(token.balance(&alice), 1000);

        // bob is not on the allow-list yet — transfer must be rejected.
        let result = token.try_transfer(&alice, &bob, &100);
        assert_eq!(result, Err(Ok(Error::RejectedByCompliance)));
        assert_eq!(token.balance(&alice), 1000);
        assert_eq!(token.balance(&bob), 0);

        // Once bob is allow-listed, the same transfer succeeds.
        module.set_allowed(&admin, &bob, &true);
        token.transfer(&alice, &bob, &100);
        assert_eq!(token.balance(&alice), 900);
        assert_eq!(token.balance(&bob), 100);
    }

    #[test]
    fn transfer_fails_on_insufficient_balance() {
        let (env, admin, token) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        token.mint(&admin, &alice, &50);

        let result = token.try_transfer(&alice, &bob, &100);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }

    #[test]
    fn register_module_rejects_non_admin_caller() {
        let (env, _admin, token) = setup();
        let impostor = Address::generate(&env);
        let fake_module = Address::generate(&env);
        let result = token.try_register_module(&impostor, &fake_module);
        assert_eq!(result, Err(Ok(Error::NotAdmin)));
    }
}
