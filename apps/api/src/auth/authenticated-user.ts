export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  scopes: string[];
}

