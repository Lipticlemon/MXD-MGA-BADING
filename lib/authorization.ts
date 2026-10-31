/** Trusted dispatch establishes identity; this check establishes owner membership. */
export function isOwner(user:{email:string}|null,configuredEmail:string|undefined){
  if(!configuredEmail||!user)return false;
  return user.email.trim().toLowerCase()===configuredEmail.trim().toLowerCase();
}
