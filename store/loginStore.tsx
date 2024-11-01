'use client';
import app, { db } from '@/app/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import { signOut, useSession } from 'next-auth/react';
import { createContext, useEffect, useState } from 'react';

interface LoginStoreProps {
  children: React.ReactNode; // children의 타입을 명시적으로 정의
}

interface stateType {
  loginState: boolean;
  userKey: string;
  logout: () => void;
  userInfo: {
    account: {
      accountNumber: string;
      balance: number;
    }[];
    birth: string;
    nickname: string;
  };
}

export const LoginContext = createContext<stateType>({
  loginState: false,
  userKey: '',
  logout: () => {
    console.log('logout');
  },
  userInfo: {
    account: [{ accountNumber: '', balance: 0 }],
    birth: '1999-12-08',
    nickname: 'name',
  },
});

export default function LoginStore({ children }: LoginStoreProps) {
  const auth = getAuth(app);
  const [loginState, setLoginState] = useState(true);
  const [userKey, setUserKey] = useState('');
  const [userInfo, setUserInfo] = useState({
    account: [{ accountNumber: '', balance: 0 }],
    birth: '1999-12-08',
    nickname: 'name',
  });

  const { data: session } = useSession();
  console.log(session);

  const sessionExpirationTime = 30 * 60 * 1000;

  useEffect(() => {
    const login = onAuthStateChanged(auth, (user) => {
      if (!user && !session?.user) {
        setLoginState(false);
      } else {
        setLoginState(true);
      }

      if (loginState && user) {
        setUserKey(user.uid);
      } else if (loginState && session?.user) {
        const { id } = session.user;
        setUserKey(String(id));
      }
      if (loginState) {
        const logoutTimer = setTimeout(() => {
          auth.signOut();
          signOut({ redirect: true, callbackUrl: '/' });
          setLoginState(false);
          alert('세션이 만료되어 로그아웃되었습니다.');
        }, sessionExpirationTime);

        return () => clearTimeout(logoutTimer);
      }
    });

    return () => {
      login();
    };
  }, [loginState, auth, session]);

  useEffect(() => {
    if (userKey) {
      const fetchAccounts = async () => {
        const userInfoRef = ref(db, `users/${userKey}`);
        const snapshot = await get(userInfoRef);
        if (snapshot.exists()) {
          setUserInfo(snapshot.val() || {}); // 기존 계좌 정보 가져오기
        } else {
          console.log('No user data found');
        }
      };

      fetchAccounts();
    }
  }, [userKey]);

  const loginStore: stateType = {
    loginState,
    userKey,
    userInfo,
    logout: async () => {
      auth.signOut();
      await signOut({ redirect: true, callbackUrl: '/' });
      alert('로그아웃 되었습니다.');
    },
  };

  return (
    <LoginContext.Provider value={loginStore}>{children}</LoginContext.Provider>
  );
}