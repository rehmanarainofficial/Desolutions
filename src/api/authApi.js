import { baseApi } from './baseApi';
import Toast from 'react-native-toast-message';

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
        if (response.status === true) {
          const user = response.data.find(u => u.user_id === arg.username);
          if (user) {
            return { success: true, user, message: response.message };
          } else {
            throw new Error('User not found in response data');
          }
        } else {
          throw new Error(response.message || 'Login failed');
        }
      },
      transformErrorResponse: (response, meta, arg) => {
        console.log('API Error response:', response);
        return {
          success: false,
          message:
            response?.data?.message ||
            response?.error ||
            'Network error occurred',
          detail: response,
        };
      },
      invalidatesTags: ['Auth', 'User'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
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
  }),
  overrideExisting: true,
});

export const { useLoginMutation } = authApi;
