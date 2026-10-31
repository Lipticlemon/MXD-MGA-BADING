declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_EMAIL?: string;
    DEPLOY_TARGET?:string;
    MODE?:string;
    ADMIN_KEY_HASH?:string;
    BUCKET?: R2Bucket;
  }
}
