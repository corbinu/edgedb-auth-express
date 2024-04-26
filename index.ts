import type {  NextFunction, Response } from "express";
import express from "express";
import cookieParser from "cookie-parser";
import { createClient } from "edgedb";
import createExpressAuth from "@edgedb/auth-express";
import type {CallbackRequest, AuthRequest, SessionRequest } from "@edgedb/auth-express";
import { engine } from 'express-handlebars';

const client = createClient();
const auth = createExpressAuth(client, {
  baseUrl: "http://localhost:3000",
});

const app = express();
const port = 3000;

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(auth.createSessionMiddleware());

const builtinRouter = auth.createBuiltinRouter({
  callback: [
    (req: CallbackRequest, res: Response, next: NextFunction) => {
      if (req.isSignUp) {
        return res.redirect("/onboarding");
      }

      res.redirect("/");
    },
    (error: any, req, res, next) => {
      res.redirect(`/error?error=${encodeURIComponent(error.message)}`);
    },
  ],
});

app.use("/auth", builtinRouter);

const emailPasswordRouter = auth.createEmailPasswordRouter(
  "/auth/email-password", // Path to mount router at
  "/forgot-password", // Path to your custom reset password UI
  {
    signIn: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/");
      },
    ],
    signUp: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/onboarding");
      },
    ],
    verify: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/");
      },
    ],
    sendPasswordResetEmail: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/email-success");
      },
    ],
    resetPassword: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/email-success");
      },
    ],
    resendVerificationEmail: [
      (req: AuthRequest, res: Response) => {
        res.redirect("/");
      },
    ],
  }
);

app.use(emailPasswordRouter);

async function requireAuth(
  req: SessionRequest,
  res: Response,
  next: NextFunction
) {
  if (!(await req.session?.isSignedIn())) {
    return res.redirect("/auth/signin");
  }

  next();
}

app.get('/dashboard', requireAuth, async (req: SessionRequest, res: Response) => {
  if (!(await req.session?.isSignedIn())) {
    return res.redirect("/auth/signin");
  }

  res.render(
    "dashboard",
    { title: "Dashboard", message: "Welcome to your dashboard!" }
  );

});

app.get("/signout", auth.signout, (req, res: Response) => {
  res.redirect("/goodbye");
});

app.get('/', (req: any, res: any) => {
  res.render('home');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
