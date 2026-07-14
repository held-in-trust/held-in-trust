#![no_std]

//! A compliance module implementing the shared `is_transfer_allowed`
//! interface (see `ARCHITECTURE.md`): a transfer is allowed only if both the
//! sender and recipient are on this module's per-issuer allow-list.
//!
//! Deployed as its own standalone contract and registered with one or more
//! `compliant_token` instances by contract address — `compliant_token` calls
//! back into this contract dynamically via `invoke_contract`, so this module
//! has no compile-time dependency on the token contract at all.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
}

#[contracttype]
enum DataKey {
    Admin,
    Allowed(Address),
}

#[contract]
pub struct JurisdictionAllowlistContract;

#[contractimpl]
impl JurisdictionAllowlistContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Admin-only: add or remove `user` from the allow-list.
    pub fn set_allowed(
        env: Env,
        admin: Address,
        user: Address,
        allowed: bool,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }
        admin.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Allowed(user), &allowed);
        Ok(())
    }

    pub fn is_allowed(env: Env, user: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Allowed(user))
            .unwrap_or(false)
    }

    /// The shared compliance-module interface every module implements:
    /// `compliant_token` calls this dynamically for every transfer.
    pub fn is_transfer_allowed(env: Env, from: Address, to: Address, _amount: i128) -> bool {
        Self::is_allowed(env.clone(), from) && Self::is_allowed(env, to)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn client() -> (Env, Address, JurisdictionAllowlistContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(JurisdictionAllowlistContract, ());
        let client = JurisdictionAllowlistContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    #[test]
    fn transfer_allowed_only_when_both_parties_are_allowed() {
        let (env, admin, client) = client();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        assert!(!client.is_transfer_allowed(&alice, &bob, &100));

        client.set_allowed(&admin, &alice, &true);
        assert!(!client.is_transfer_allowed(&alice, &bob, &100));

        client.set_allowed(&admin, &bob, &true);
        assert!(client.is_transfer_allowed(&alice, &bob, &100));
    }

    #[test]
    fn set_allowed_can_revoke() {
        let (env, admin, client) = client();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        client.set_allowed(&admin, &alice, &true);
        client.set_allowed(&admin, &bob, &true);
        assert!(client.is_transfer_allowed(&alice, &bob, &100));

        client.set_allowed(&admin, &alice, &false);
        assert!(!client.is_transfer_allowed(&alice, &bob, &100));
    }

    #[test]
    fn double_initialize_fails() {
        let (_, admin, client) = client();
        let result = client.try_initialize(&admin);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn set_allowed_rejects_non_admin_caller() {
        let (env, _admin, client) = client();
        let impostor = Address::generate(&env);
        let user = Address::generate(&env);
        let result = client.try_set_allowed(&impostor, &user, &true);
        assert_eq!(result, Err(Ok(Error::NotAdmin)));
    }
}
