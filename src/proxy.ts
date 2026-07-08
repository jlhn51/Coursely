import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect only app routes. Landing, sign-in/up, and any future marketing
// pages stay public. When the (app) route group ships, expand this matcher
// to cover those paths.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/courses(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
