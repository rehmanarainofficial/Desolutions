import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import store from '../store';
import { logout } from '../store/slices/authSlice';
import { BASE_URL } from '../api/baseApi';

let sessionCheckInterval = null;
let appStateSubscription = null;
let isLoggingOut = false;
let isCheckingSession = false;

/**
 * Performs complete logout locally (clears Redux & AsyncStorage) and displays Toast.
 */
export const performCompleteLogout = async (
  title = 'Logged Out',
  message = 'Your session has ended.',
) => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    store.dispatch(logout());
  } catch (err) {
    console.log('Error dispatching logout action:', err);
  }

  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('company');
  } catch (err) {
    console.log('Error clearing AsyncStorage on logout:', err);
  }

  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: 4000,
  });

  setTimeout(() => {
    isLoggingOut = false;
  }, 2000);
};

/**
 * User-initiated logout from the app (notifies backend that login_status = '1').
 */
export const logoutUserManually = async () => {
  const state = store.getState();
  const currentUser = state?.auth?.user;
  const company = state?.auth?.company;

  if (currentUser?.id && company) {
    try {
      const formData = new FormData();
      formData.append('id', String(currentUser.id));
      formData.append('company', company);
      formData.append('inactive', String(currentUser.inactive || '0'));
      formData.append('login_status', '1'); // 1 = Logged out
      formData.append('login_active_status', '0');
      if (currentUser.app_version) {
        formData.append('app_version', String(currentUser.app_version));
      }

      await fetch(`${BASE_URL}/auth/logout_post.php`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.log('Error notifying server on manual logout:', err);
    }
  }

  await performCompleteLogout('Logged Out', 'You have been logged out successfully.');
};

/**
 * Validates whether the current active user is still allowed to stay logged in.
 * If user was deactivated or logged out remotely, logs them out immediately.
 */
export const validateCurrentUserSession = async () => {
  if (isCheckingSession || isLoggingOut) return;

  const state = store.getState();
  const currentUser = state?.auth?.user;
  const company = state?.auth?.company;
  const isAuthenticated = state?.auth?.isAuthenticated;

  if (!isAuthenticated || !currentUser || !company) {
    return;
  }

  isCheckingSession = true;
  try {
    const formData = new FormData();
    formData.append('company', company);

    const response = await fetch(`${BASE_URL}/auth/users.php`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    if (result && (result.status === true || result.status === 'true')) {
      const users = result.data || [];
      const currentUserId = String(currentUser.id || '');
      const currentUserName = String(currentUser.user_id || '').toLowerCase();

      const matchedUser = users.find(
        u =>
          (currentUserId && String(u.id) === currentUserId) ||
          (currentUserName && String(u.user_id || '').toLowerCase() === currentUserName),
      );

      if (!matchedUser) {
        await performCompleteLogout(
          'Account Removed',
          'Your user account is no longer available.',
        );
        return;
      }

      // Check if user was deactivated by admin
      if (String(matchedUser.inactive) === '1') {
        await performCompleteLogout(
          'Account Deactivated',
          'Your account has been deactivated by administrator.',
        );
        return;
      }

      // Check if user was logged out remotely by admin
      if (String(matchedUser.login_status) === '1') {
        await performCompleteLogout(
          'Session Ended',
          'You have been logged out remotely by administrator.',
        );
        return;
      }
    }
  } catch (error) {
    // Network blips should not immediately boot the user
    console.log('Session validation check error:', error?.message);
  } finally {
    isCheckingSession = false;
  }
};

/**
 * Starts periodic session validation (every 10 seconds) and on AppState resume.
 */
export const startSessionWatcher = () => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  // Initial check
  validateCurrentUserSession();

  // Periodic check every 10 seconds
  sessionCheckInterval = setInterval(() => {
    validateCurrentUserSession();
  }, 10000);

  // AppState change listener (runs whenever user switches back to active app)
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  appStateSubscription = AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      validateCurrentUserSession();
    }
  });
};

/**
 * Stops session validation watcher.
 */
export const stopSessionWatcher = () => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

