import { IUser } from './user.types'; 
import { UserRole } from './role.types';

export interface IAuthOptions {
  providers: any[]; 
  callbacks: any;
  pages?: {
    signIn?: string;
    error?: string;
  };
}

export interface AuthSession {
  user: IUser;      
  role: UserRole;
  accessToken?: string;
}