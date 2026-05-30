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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          let userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // First time login, create a profile
            const isAdminEmail = user.email === 'tensangnajuls@gmail.com';
            const newProfile = {
              email: user.email || '',
              displayName: user.displayName || 'Generic User',
              role: isAdminEmail ? 'admin' : 'customer',
              status: isAdminEmail ? 'approved' : 'pending',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            userDoc = await getDoc(userDocRef);
          }
          
          const profileData = userDoc.data() as UserProfile;
          setProfile({ ...profileData, uid: user.uid });
        } catch (error) {
          console.error("Error fetching profile:", error);
          // Don't call handleFirestoreError here as it might loop or block initial load
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
