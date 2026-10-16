export async function changeAccountPassword({ authClient, verificationClient, email, currentPassword, newPassword }) {
  if (!authClient || !verificationClient || !email) {
    throw new Error('Your account session is unavailable. Please sign in again.');
  }
  if (!currentPassword || newPassword.length < 8) {
    throw new Error('Enter your current password and a new password with at least 8 characters.');
  }

  let verified = false;
  try {
    const { error } = await verificationClient.auth.signInWithPassword({ email, password: currentPassword });
    if (error) throw new Error(error.code === 'invalid_credentials' ? 'Your current password is incorrect.' : error.message);
    verified = true;
    const { error: updateError } = await authClient.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  } finally {
    // Revoke only the temporary verification session; preserve the account's active session.
    if (verified) await verificationClient.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}
