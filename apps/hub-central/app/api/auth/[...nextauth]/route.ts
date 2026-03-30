import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth"; // 🟢 On importe le cerveau unique !

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };