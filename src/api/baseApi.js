import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@env';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
  }),
  tagTypes: ['User', 'Auth', 'Dashboard', 'Dimension'],
  keepUnusedDataFor: 600, // 10 minutes cache
  endpoints: builder => ({
    getFunctionalityCheck: builder.mutation({
      query: (body) => {
        const formData = new FormData();
        formData.append('company', body.company);
        
        return {
          url: 'access/functionality_checks.php',
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
      },
    }),
    getDimensionDropdown: builder.mutation({
      query: (body) => {
        const formData = new FormData();
        formData.append('company', body.company);
        
        return {
          url: 'dropdown/dimension1.php',
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
      },
    }),
    toggleErpStatus: builder.mutation({
      query: (body) => {
        const formData = new FormData();
        formData.append('company', body.company);
        formData.append('activate', body.activate);
        
        return {
          url: 'access/erp_on_off.php',
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        };
      },
    }),
  }),
});

export const { useGetFunctionalityCheckMutation, useGetDimensionDropdownMutation, useToggleErpStatusMutation } = baseApi;

export default baseApi;
