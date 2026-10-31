import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import store from '../store';
import { logout } from '../store/slices/authSlice';
import { authApi } from '../api/authApi';
import { APP_VERSION, isVersionOutdated } from '../utils/AppVersion';

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
 * User-initiated logout from the app (notifies backend via RTK Query that login_status = '1').
 */
export const logoutUserManually = async () => {
  const state = store.getState();
  const currentUser = state?.auth?.user;
  const company = state?.auth?.company;

  if (currentUser?.id && company) {
    try {
      await store
        .dispatch(
          authApi.endpoints.updateUserStatus.initiate({
            id: currentUser.id,
            company,
            inactive: currentUser.inactive || '0',
            login_status: '1', // 1 = Logged out
            login_active_status: '0',
            app_version: currentUser.app_version || APP_VERSION,
          }),
        )
        .unwrap();
    } catch (err) {
      console.log('Error notifying server on manual logout via RTK Query:', err);
    }
  }

  await performCompleteLogout('Logged Out', 'You have been logged out successfully.');
};

/**
 * Validates whether the current active user is still allowed to stay logged in.
 * Uses RTK Query authApi.endpoints.getUsers.initiate().
 * If user was deactivated, app version is outdated, or logged out remotely, logs them out immediately.
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
    const usersResult = await store
      .dispatch(
        authApi.endpoints.getUsers.initiate(
          { company },
          { forceRefetch: true },
        ),
      )
      .unwrap();

    const users = Array.isArray(usersResult) ? usersResult : [];
    const currentUserId = String(currentUser.id || '');
    const currentUserName = String(currentUser.user_id || '').toLowerCase();

    const matchedUser = users.find(
      u =>
        (currentUserId && String(u.id) === currentUserId) ||
        (currentUserName &&
          String(u.user_id || '').toLowerCase() === currentUserName),
    );

    if (!matchedUser) {
      await performCompleteLogout(
        'Account Removed',
        'Your user account is no longer available.',
      );
      return;
    }

    // 1. Check if user was deactivated by admin
    if (String(matchedUser.inactive) === '1') {
      await performCompleteLogout(
        'Account Deactivated',
        'Your account has been deactivated by administrator.',
      );
      return;
    }

    // 2. Check if user's installed app version is outdated
    const minRequiredVersion = matchedUser.min_required_version;
    if (isVersionOutdated(APP_VERSION, minRequiredVersion)) {
      await performCompleteLogout(
        'Update Required',
        `A new version (v${minRequiredVersion}) of Desolutions is required. You are using v${APP_VERSION}. Please install the latest update.`,
      );
      return;
    }

    // 3. Check if user was logged out remotely by admin
    if (String(matchedUser.login_status) === '1') {
      await performCompleteLogout(
        'Session Ended',
        'You have been logged out remotely by administrator.',
      );
      return;
    }
  } catch (error) {
    // Network errors should not immediately boot the user
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
