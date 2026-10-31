import { baseApi } from './baseApi';

export const purchaseApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getPurchaseStockMasterDetail: builder.mutation({
      query: ({ company, stock_id }) => {
        const formData = new FormData();
        formData.append('company', company);
        formData.append('stock_id', String(stock_id).trim());

        return {
          url: 'dropdown/stock_master_post.php',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: response => {
        if (response?.status === 'true' || response?.status === true) {
          const product = response.data?.[0] || null;
          return {
            success: true,
            data: response.data || [],
            product,
          };
        }
        return {
          success: false,
          message: response?.message || 'Product not found with this Stock ID',
        };
      },
      transformErrorResponse: response => {
        return {
          success: false,
          message:
            response?.data?.message ||
            response?.error ||
            'Failed to fetch stock item details',
        };
      },
    }),

    getSuppliersMaster: builder.query({
      query: ({ company }) => {
        const formData = new FormData();
        formData.append('company', company);

        return {
          url: 'dropdown/suppliers.php',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: response => {
        if (response?.status === 'true' || response?.status === true) {
          const list = response.data || [];
          return list
            .filter(item => String(item.inactive || '0') !== '1')
            .map(item => ({
              supplier_id: String(item.supplier_id),
              person_id: String(item.supplier_id),
              name: (item.name || '').replace(/&amp;/g, '&'),
              debtor_ref: (item['debtor_ref '] || item.debtor_ref || '').trim(),
              contact_no: item.contact_no || '',
              cnic: item.cnic || '',
              address: item.address || '',
              current_balance: item.current_balance ?? 0,
              last_order_date: item.last_order_date || '',
              last_order_total: item.last_order_total || '',
            }));
        }
        return [];
      },
    }),

    submitPurchaseOrder: builder.mutation({
      query: ({
        trans_type,
        person_id,
        ord_date,
        po_no,
        driver_name,
        total,
        vehicle_no,
        user_id,
        purch_order_details,
        driver_cnic,
        update_id,
        comments,
        company,
      }) => {
        const formData = new FormData();
        formData.append('trans_type', String(trans_type));
        formData.append('person_id', String(person_id));
        formData.append('ord_date', String(ord_date));
        formData.append('po_no', String(po_no || ''));
        formData.append('driver_name', String(driver_name || ''));
        formData.append('total', String(total));
        formData.append('vehicle_no', String(vehicle_no || ''));
        formData.append('user_id', String(user_id || ''));
        formData.append(
          'purch_order_details',
          typeof purch_order_details === 'string'
            ? purch_order_details
            : JSON.stringify(purch_order_details),
        );
        formData.append('driver_cnic', String(driver_cnic || ''));
        formData.append('update_id', String(update_id ?? 0));
        formData.append('comments', String(comments || ''));
        formData.append('company', String(company));

        return {
          url: 'portal/post_service_purch_sale.php',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: response => {
        if (response?.status === true || response?.status === 'true') {
          return {
            success: true,
            message: response?.message || 'Purchase order submitted successfully',
            data: response,
          };
        }
        return {
          success: false,
          message: response?.message || 'Failed to submit purchase order',
        };
      },
      transformErrorResponse: response => {
        return {
          success: false,
          message:
            response?.data?.message ||
            response?.error ||
            'Network error occurred during purchase order submission',
        };
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetPurchaseStockMasterDetailMutation,
  useGetSuppliersMasterQuery,
  useSubmitPurchaseOrderMutation,
} = purchaseApi;

