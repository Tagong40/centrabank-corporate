export type UserRole = 'customer' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: any; // Firestore Timestamp
  phoneNumber?: string;
  address?: string;
  cityName?: string;
  country?: string;
  postalCode?: string;
  companyName?: string;
  taxId?: string; // SSN / EIN / TIN
  twoFactorEnabled?: boolean;
  securityPINCode?: string; // 6-digit secure transaction authorization PIN
  dailyTransferLimit?: number;
  ipWhitelist?: string;
  preferredLanguage?: string;
  // Compliance / KYC onboarding
  onboardingCompleted?: boolean;
  businessType?: string;
  industry?: string;
  purposeOfAccount?: string;
  expectedMonthlyVolume?: string;
  sourceOfFunds?: string;
  isPEP?: boolean;
  isUSPerson?: boolean;
  agreedToTerms?: boolean;
  agreedToAML?: boolean;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  createdAt: any;
}

export interface Transaction {
  id: string;
  fromAccountId: string;
  fromUserId: string;
  toAccountId: string;
  toUserId: string;
  toAccountNumber: string;
  amount: number;
  description: string;
  status: 'pending' | 'on_hold' | 'fraud_detected' | 'completed' | 'failed' | 'rejected';
  type?: 'internal' | 'external' | 'topup';
  timestamp: any;
  paymentMethod?: string;
  routingNumber?: string;
  recipientBank?: string;
  beneficiaryName?: string;
}

export interface Card {
  id: string;
  userId: string;
  accountId: string;
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  type: 'debit' | 'credit';
  status: 'active' | 'locked';
  createdAt: any;
}

export interface Investment {
  id: string;
  userId: string;
  assetType: 'stock' | 'crypto' | 'fund';
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentValue: number;
  createdAt: any;
}
