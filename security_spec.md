# Security Specification for CentraBank Corporate

## 1. Data Invariants
- A user must have a role ('customer' or 'admin') and a status ('pending' by default).
- Only an admin can change a user's status or role.
- Customers can only read their own user profile and their own accounts.
- Customers can only list transactions where they are the sender (`fromUserId`).
- Transactions are immutable once created.
- Account balances can only be modified by the system or during a transaction. (In this simplified ruleset, we'll allow owners to create transactions but restrict who can update balances).
- No one can delete transaction records.

## 2. The Dirty Dozen Payloads (Identity & Integrity)

1. **Self-Promotion Attack**: Customer tries to update their own `role` to 'admin'.
2. **Account Hijack**: Customer tries to read another user's private info.
3. **Ghost Account Creation**: User tries to create an account for another UID.
4. **Negative Balance Transfer**: Customer tries to transfer a negative amount.
5. **Overdraft Attack**: Customer tries to transfer more than their balance (logic level, but rules can prevent setting balance below 0).
6. **Shadow Update**: Adding an `isAdmin: true` field to a transaction record.
7. **Transaction Forgery**: Customer tries to create a transaction where `fromUserId` is someone else.
8. **Admin Impersonation**: Non-authenticated user trying to access admin collections.
9. **Illegal ID Poisoning**: Transaction ID with 1MB of junk data.
10. **Status Skipping**: Customer tries to set their status to 'approved' upon registration.
11. **Account Number Collision**: Trying to overwrite an existing account number by creating a doc with the same ID but different owner.
12. **Historical Erasure**: Attempting to delete a transaction record.

## 3. Test Runner (Draft Plan)
A `firestore.rules.test.ts` will verify these denials.

---

# Draft Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 0. Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper Primitives
    function isSignedIn() { return request.auth != null; }
    function isVerified() { return isSignedIn() && request.auth.token.email_verified == true; }
    function existingData() { return resource.data; }
    function incomingData() { return request.resource.data; }
    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$'); }
    
    function getUserData(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data;
    }
    
    function isAdmin() {
      return isSignedIn() && getUserData(request.auth.uid).role == 'admin';
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Validation Blueprints
    function isValidUser(data) {
      return data.email is string && data.email.size() <= 256 &&
             data.role in ['customer', 'admin'] &&
             data.status in ['pending', 'approved', 'rejected'] &&
             data.createdAt is timestamp;
    }

    function isValidAccount(data) {
      return data.userId is string && data.userId.size() <= 128 &&
             data.accountName is string && data.accountName.size() <= 100 &&
             data.accountNumber is string && data.accountNumber.size() <= 20 &&
             data.balance is number && data.balance >= 0 &&
             data.currency is string && data.currency.size() <= 3;
    }

    function isValidTransaction(data) {
      return data.fromAccountId is string && data.fromAccountId.size() <= 128 &&
             data.fromUserId is string && data.fromUserId == request.auth.uid &&
             data.toAccountNumber is string && data.toAccountNumber.size() <= 20 &&
             data.amount is number && data.amount > 0 &&
             data.status in ['completed', 'failed'] &&
             data.timestamp == request.time;
    }

    // Match Blocks
    match /users/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow list: if isAdmin();
      allow create: if isOwner(userId) && 
                      isValidUser(incomingData()) && 
                      incomingData().role == 'customer' && 
                      incomingData().status == 'pending' &&
                      incomingData().createdAt == request.time;
      allow update: if (isAdmin() && isValidUser(incomingData())) ||
                      (isOwner(userId) && 
                       incomingData().diff(existingData()).affectedKeys().hasOnly(['displayName']) &&
                       incomingData().displayName is string);
    }

    match /accounts/{accountId} {
      allow get: if isSignedIn() && (isOwner(existingData().userId) || isAdmin());
      allow list: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && isOwner(incomingData().userId) && isValidAccount(incomingData());
      allow update: if isAdmin() || (isOwner(existingData().userId) && 
                                     incomingData().diff(existingData()).affectedKeys().hasOnly(['accountName']));
      // Note: Balance updates should ideally be via a batch or transaction that includes a record.
      // In this version, we allow system-like updates for simplicity in the demo, or restrict it more.
    }

    match /transactions/{transactionId} {
      allow get: if isSignedIn() && (isOwner(existingData().fromUserId) || isAdmin());
      allow list: if isSignedIn() && (resource.data.fromUserId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && isOwner(incomingData().fromUserId) && isValidTransaction(incomingData());
      allow update, delete: if false; // Transactions are immutable
    }
  }
}
```
