#![no_std]

//! A compliance module implementing the shared `is_transfer_allowed`
//! interface: a transfer is allowed only if both parties hold current
//! (non-expired) accreditation. Unlike `jurisdiction_allowlist`'s static
//! boolean flag, accreditation lapses — each investor has an expiry ledger,
//! checked against the current ledger sequence at transfer time.

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
    ExpiryLedger(Address),
}

#[contract]
pub struct AccreditedInvestorContract;

#[contractimpl]
impl AccreditedInvestorContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Admin-only: mark `investor` accredited until `expiry_ledger`
    /// (inclusive). Passing an `expiry_ledger` at or before the current
    /// ledger sequence effectively revokes accreditation immediately.
    pub fn set_accredited(
        env: Env,
        admin: Address,
        investor: Address,
        expiry_ledger: u32,
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
            .set(&DataKey::ExpiryLedger(investor), &expiry_ledger);
        Ok(())
    }

    pub fn is_accredited(env: Env, investor: Address) -> bool {
        let expiry: Option<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::ExpiryLedger(investor));
        match expiry {
            Some(expiry_ledger) => env.ledger().sequence() <= expiry_ledger,
            None => false,
        }
    }

    /// The shared compliance-module interface every module implements:
    /// `compliant_token` calls this dynamically for every transfer.
    pub fn is_transfer_allowed(env: Env, from: Address, to: Address, _amount: i128) -> bool {
        Self::is_accredited(env.clone(), from) && Self::is_accredited(env, to)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger as _};

    fn client() -> (Env, Address, AccreditedInvestorContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(AccreditedInvestorContract, ());
        let client = AccreditedInvestorContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    fn set_ledger(env: &Env, sequence: u32) {
        env.ledger().with_mut(|li| li.sequence_number = sequence);
    }

    #[test]
    fn transfer_allowed_only_when_both_parties_are_accredited_and_unexpired() {
        let (env, admin, client) = client();
        set_ledger(&env, 100);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        assert!(!client.is_transfer_allowed(&alice, &bob, &100));

        client.set_accredited(&admin, &alice, &200);
        assert!(!client.is_transfer_allowed(&alice, &bob, &100));

        client.set_accredited(&admin, &bob, &200);
        assert!(client.is_transfer_allowed(&alice, &bob, &100));
    }

    #[test]
    fn accreditation_expires_at_the_boundary() {
        let (env, admin, client) = client();
        let alice = Address::generate(&env);

        client.set_accredited(&admin, &alice, &200);

        set_ledger(&env, 200);
        assert!(
            client.is_accredited(&alice),
            "still valid at exactly the expiry ledger"
        );

        set_ledger(&env, 201);
        assert!(!client.is_accredited(&alice), "expired the ledger after");
    }

    #[test]
    fn set_accredited_can_immediately_revoke() {
        let (env, admin, client) = client();
        let alice = Address::generate(&env);
        set_ledger(&env, 100);

        client.set_accredited(&admin, &alice, &200);
        assert!(client.is_accredited(&alice));

        client.set_accredited(&admin, &alice, &50); // expiry in the past
        assert!(!client.is_accredited(&alice));
    }

    #[test]
    fn set_accredited_rejects_non_admin_caller() {
        let (env, _admin, client) = client();
        let impostor = Address::generate(&env);
        let investor = Address::generate(&env);
        let result = client.try_set_accredited(&impostor, &investor, &200);
        assert_eq!(result, Err(Ok(Error::NotAdmin)));
    }

    #[test]
    fn double_initialize_fails() {
        let (_, admin, client) = client();
        let result = client.try_initialize(&admin);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }
}
