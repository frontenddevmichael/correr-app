/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as automation from "../automation.js";
import type * as billing from "../billing.js";
import type * as campus from "../campus.js";
import type * as checkins from "../checkins.js";
import type * as circles from "../circles.js";
import type * as commitments from "../commitments.js";
import type * as crons from "../crons.js";
import type * as gamification from "../gamification.js";
import type * as hackathon from "../hackathon.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as notifications from "../notifications.js";
import type * as openrouter from "../openrouter.js";
import type * as partnerships from "../partnerships.js";
import type * as profile from "../profile.js";
import type * as roadmap from "../roadmap.js";
import type * as visions from "../visions.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  ai: typeof ai;
  auth: typeof auth;
  automation: typeof automation;
  billing: typeof billing;
  campus: typeof campus;
  checkins: typeof checkins;
  circles: typeof circles;
  commitments: typeof commitments;
  crons: typeof crons;
  gamification: typeof gamification;
  hackathon: typeof hackathon;
  http: typeof http;
  lib: typeof lib;
  notifications: typeof notifications;
  openrouter: typeof openrouter;
  partnerships: typeof partnerships;
  profile: typeof profile;
  roadmap: typeof roadmap;
  visions: typeof visions;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
