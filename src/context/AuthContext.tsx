import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  needsOnboarding: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    let userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const isAdminEmail = firebaseUser.email === 'lovepiina1@gmail.com';
      const newProfile = {
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Generic User',
        role: isAdminEmail ? 'admin' : 'customer',
        status: isAdminEmail ? 'approved' : 'pending',
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newProfile);
      userDoc = await getDoc(userDocRef);
    }

    const profileData = userDoc.data() as UserProfile;
    setProfile({ ...profileData, uid: firebaseUser.uid });
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await loadProfile(firebaseUser);
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const needsOnboarding = !!(profile && !isAdmin && !profile.onboardingCompleted);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, needsOnboarding, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
