import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "CANDIDATE";
        token.id = user.id || token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : "CANDIDATE";
        session.user.id = (token.id as string) || (token.sub as string) || "";
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path.startsWith("/admin") && auth?.user?.role !== "ADMIN") {
        return false;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

