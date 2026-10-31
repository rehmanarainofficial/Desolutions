import { baseApi, BASE_URL } from './baseApi';
import Toast from 'react-native-toast-message';
import { APP_VERSION, isVersionOutdated } from '../utils/AppVersion';

export const authApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation({
      query: credentials => {
        const formData = new FormData();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        formData.append('company', credentials.company);
        return {
          url: 'auth/users.php',
          method: 'POST',
          body: formData,
        };
      },

      transformResponse: (response, meta, arg) => {
        if (response.status === true || response.status === 'true') {
          const user = response.data?.find(
            u =>
              String(u.user_id).trim().toLowerCase() ===
              String(arg.username).trim().toLowerCase(),
          );

          if (!user) {
            throw new Error('User not found in response data');
          }

          // 1. Check if account is inactive / deactivated
          if (String(user.inactive) === '1') {
            throw new Error(
              'Your account has been deactivated. Please contact administrator.',
            );
          }

          // 2. Check min_required_version from API vs running app version
          const minRequiredVersion = user.min_required_version;
          if (isVersionOutdated(APP_VERSION, minRequiredVersion)) {
            throw new Error(
              `A new version (v${minRequiredVersion}) of Desolutions is required. You are using v${APP_VERSION}. Please install the latest update.`,
            );
          }

          // 3. Check single active session: only one user/device logged in at a time
          if (String(user.login_status) === '0') {
            throw new Error(
              'Only one active session is allowed at a time. This account is already logged in on another device.',
            );
          }

          return {
            success: true,
            user: { ...user, login_status: '0' },
            message: response.message,
          };
        } else {
          throw new Error(response.message || 'Login failed');
        }
      },
      transformErrorResponse: (response, meta, arg) => {
        const reqUrl = meta?.request?.url || `${BASE_URL}/auth/users.php`;
        console.log('❌ Login Request Failed:', {
          url: reqUrl,
          method: meta?.request?.method || 'POST',
          status: response?.status,
          error: response?.error,
        });

        let displayMessage =
          response?.data?.message ||
          response?.error ||
          'Network error occurred';

        if (
          String(response?.error).includes('Network request failed') ||
          response?.status === 'FETCH_ERROR'
        ) {
          displayMessage = `Unable to connect to server (${reqUrl}). Please check your internet or DNS connection.`;
        }

        return {
          success: false,
          message: displayMessage,
          detail: response,
          requestUrl: reqUrl,
        };
      },
      invalidatesTags: ['Auth', 'User', 'UserList'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // Notify server via RTK Query that user is now logged in (login_status: '0')
          if (data?.user?.id && arg.company) {
            try {
              dispatch(
                authApi.endpoints.updateUserStatus.initiate({
                  id: data.user.id,
                  company: arg.company,
                  inactive: data.user.inactive || '0',
                  login_status: '0',
                  login_active_status: '0',
                  app_version: APP_VERSION,
                }),
              );
            } catch (postErr) {
              console.log('Error updating login status on server on login:', postErr);
            }
          }

          Toast.show({
            type: 'success',
            text1: 'Login Successful',
            text2: 'Welcome back!',
          });
        } catch (error) {
          console.error('Login Query Failed:', error);
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2:
              error?.error?.message ||
              error?.message ||
              'Please check your credentials and try again.',
          });
        }
      },
    }),

    getUsers: builder.query({
      query: ({ company }) => {
        const formData = new FormData();
        formData.append('company', company);
        return {
          url: 'auth/users.php',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: response => {
        if (response?.status === true || response?.status === 'true') {
          return response.data || [];
        }
        return [];
      },
      providesTags: ['UserList'],
    }),

    updateUserStatus: builder.mutation({
      query: ({ id, company, inactive, login_status, login_active_status, app_version }) => {
        const formData = new FormData();
        formData.append('id', String(id));
        formData.append('company', company);
        formData.append('inactive', String(inactive));
        formData.append('login_status', String(login_status));
        formData.append('login_active_status', String(login_active_status));
        if (app_version) {
          formData.append('app_version', String(app_version));
        }
        return {
          url: 'auth/logout_post.php',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: response => {
        if (typeof response === 'string') {
          try {
            return JSON.parse(response);
          } catch (e) {
            return { status: true, message: response };
          }
        }
        return response;
      },
      invalidatesTags: ['UserList'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useGetUsersQuery,
  useUpdateUserStatusMutation,
} = authApi;
