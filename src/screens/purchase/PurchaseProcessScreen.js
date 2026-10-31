import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '@config/useTheme';
import {
  useGetSuppliersMasterQuery,
  useSubmitPurchaseOrderMutation,
} from '@api/purchaseApi';
import {
  clearPurchaseCart,
  selectPurchaseCartItems,
  selectPurchaseCartGrandTotal,
} from '@store/slices/purchaseCartSlice';
import { CustomDatePicker, SearchableSelectDropdown } from '@components/common';

const ORDER_TYPES = [
  { label: 'Purchase Order', value: '18' },
  { label: 'GRN', value: '25' },
  { label: 'Supplier Invoice', value: '20' },
  { label: 'Supplier Credit Note', value: '21' },
];

const PurchaseProcessScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const company = useSelector(state => state.auth.company);
  const currentUser = useSelector(state => state.auth.user);

  // Cart from Redux
  const cartItems = useSelector(selectPurchaseCartItems);
  const cartTotal = useSelector(selectPurchaseCartGrandTotal);

  // RTK Query: Suppliers List (dropdown/suppliers.php) & Submit Order
  const { data: suppliers = [], isLoading: isSuppliersLoading } =
    useGetSuppliersMasterQuery({ company }, { skip: !company });
  const [submitPurchaseOrder, { isLoading: isSubmitting }] =
    useSubmitPurchaseOrderMutation();

  // Form State
  const [transType, setTransType] = useState('18'); // Default: Purchase Order (18)
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ordDate, setOrdDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [poNo, setPoNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverCnic, setDriverCnic] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [comments, setComments] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const s = useMemo(() => getStyles(theme), [theme]);

  // Trans type options for SearchableSelectDropdown
  const orderTypeOptions = useMemo(
    () =>
      ORDER_TYPES.map(t => ({
        id: t.value,
        value: t.value,
        name: t.label,
        subtitle: `Type Code: ${t.value}`,
      })),
    [],
  );

  // Supplier items for SearchableSelectDropdown
  const supplierOptions = useMemo(
    () =>
      suppliers.map(sup => ({
        id: String(sup.supplier_id),
        supplier_id: String(sup.supplier_id),
        name: sup.name,
        debtor_ref: sup.debtor_ref || '',
        contact_no: sup.contact_no || '',
        cnic: sup.cnic || '',
      })),
    [suppliers],
  );

  // Format ord_date for display
  const formatDateDisplay = dateStr => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Cart is Empty',
        text2: 'Please add items to cart before submitting.',
      });
      return;
    }

    if (!selectedSupplier) {
      Toast.show({
        type: 'error',
        text1: 'Supplier Required',
        text2: 'Please select a Supplier / Vendor.',
      });
      return;
    }

    // Prepare purch_order_details payload
    const purchOrderDetails = cartItems.map(item => ({
      item_code: String(item.stock_id),
      description: String(item.description || ''),
      quantity_ordered: String(item.quantity),
      unit_price: String(item.rate),
    }));

    try {
      const payload = {
        trans_type: transType,
        person_id: selectedSupplier.supplier_id,
        ord_date: ordDate,
        po_no: poNo,
        driver_name: driverName,
        total: cartTotal,
        vehicle_no: vehicleNo,
        user_id: currentUser?.id || '12',
        purch_order_details: JSON.stringify(purchOrderDetails),
        driver_cnic: driverCnic,
        update_id: 0,
        comments: comments,
        company: company,
      };

      const res = await submitPurchaseOrder(payload).unwrap();

      if (res?.success) {
        Toast.show({
          type: 'success',
          text1: 'Order Submitted',
          text2: res.message || 'Purchase order processed successfully!',
        });
        dispatch(clearPurchaseCart());
        navigation.navigate('Purchase');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Submission Failed',
          text2: res?.message || 'Could not process purchase order.',
        });
      }
    } catch (err) {
      console.log('Error submitting purchase order:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Network request failed. Please try again.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary Banner */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View>
              <Text style={s.summaryLabel}>Total Items</Text>
              <Text style={s.summaryVal}>{cartItems.length} Products</Text>
            </View>
            <View style={s.dividerVert} />
            <View>
              <Text style={s.summaryLabel}>Total Amount</Text>
              <Text style={s.summaryAmount}>
                ₨{' '}
                {cartTotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>Order Information</Text>

          {/* 1. Reusable Transaction Type Dropdown */}
          <SearchableSelectDropdown
            label="Transaction Type"
            required
            icon="document-text-outline"
            items={orderTypeOptions}
            selectedId={transType}
            onSelect={it => setTransType(it.id)}
            searchable={false}
          />

          {/* 2. Reusable Supplier / Vendor Dropdown */}
          <SearchableSelectDropdown
            label="Supplier / Vendor"
            required
            placeholder="Choose supplier..."
            searchPlaceholder="Search by name, ID, ref or phone..."
            icon="business-outline"
            items={supplierOptions}
            selectedId={selectedSupplier?.supplier_id}
            onSelect={it => setSelectedSupplier(it)}
            isLoading={isSuppliersLoading}
            searchable={true}
            renderSubtitle={it => {
              const parts = [`ID: #${it.supplier_id}`];
              if (it.debtor_ref) parts.push(`Ref: ${it.debtor_ref}`);
              if (it.contact_no) parts.push(`Ph: ${it.contact_no}`);
              return parts.join(' | ');
            }}
          />

          {/* 3. Date Picker (ord_date) */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>
              Date <Text style={s.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={s.dropdownSelector}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={s.dropdownValRow}>
                <View style={s.iconBox}>
                  <Icon
                    name="calendar-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={s.dropdownValText}>
                  {formatDateDisplay(ordDate)}
                </Text>
              </View>
              <Icon
                name="calendar-clear-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* 4. PO No */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>PO Number</Text>
            <View style={s.textInputWrapper}>
              <Icon
                name="receipt-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={s.inputIcon}
              />
              <TextInput
                style={s.textInput}
                placeholder="PO-9876"
                placeholderTextColor={theme.colors.textSecondary}
                value={poNo}
                onChangeText={setPoNo}
              />
            </View>
          </View>

          {/* 5. Driver Name */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>Driver Name</Text>
            <View style={s.textInputWrapper}>
              <Icon
                name="person-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={s.inputIcon}
              />
              <TextInput
                style={s.textInput}
                placeholder="Muhammad Ali"
                placeholderTextColor={theme.colors.textSecondary}
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>
          </View>

          {/* 6. Driver CNIC */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>Driver CNIC</Text>
            <View style={s.textInputWrapper}>
              <Icon
                name="card-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={s.inputIcon}
              />
              <TextInput
                style={s.textInput}
                placeholder="35202-1234567-1"
                placeholderTextColor={theme.colors.textSecondary}
                value={driverCnic}
                onChangeText={setDriverCnic}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* 7. Vehicle No */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>Vehicle Number</Text>
            <View style={s.textInputWrapper}>
              <Icon
                name="car-outline"
                size={18}
                color={theme.colors.textSecondary}
                style={s.inputIcon}
              />
              <TextInput
                style={s.textInput}
                placeholder="LE-2024-9988"
                placeholderTextColor={theme.colors.textSecondary}
                value={vehicleNo}
                onChangeText={setVehicleNo}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* 8. Comments */}
          <View style={s.inputGroup}>
            <Text style={s.fieldLabel}>Comments / Special Notes</Text>
            <View style={[s.textInputWrapper, s.textAreaWrapper]}>
              <TextInput
                style={[s.textInput, s.textArea]}
                placeholder="Enter any delivery instructions or special notes..."
                placeholderTextColor={theme.colors.textSecondary}
                value={comments}
                onChangeText={setComments}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Ordered Items Preview */}
        <View style={s.itemsPreviewCard}>
          <Text style={s.sectionTitle}>
            Ordered Products ({cartItems.length})
          </Text>
          {cartItems.map((item, idx) => (
            <View key={item.stock_id} style={s.previewItemRow}>
              <View style={s.previewItemLeft}>
                <Text style={s.previewItemIndex}>{idx + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.previewItemName} numberOfLines={1}>
                    {item.description || item.stock_id}
                  </Text>
                  <Text style={s.previewItemMeta}>
                    Code: #{item.stock_id} | Qty: {item.quantity} × ₨{' '}
                    {parseFloat(item.rate || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
              <Text style={s.previewItemSubtotal}>
                ₨ {(item.quantity * item.rate).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.submitBtnText}>Submit Purchase Order</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <CustomDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateSelect={d => {
          setOrdDate(d);
          setShowDatePicker(false);
        }}
        initialDate={ordDate}
      />
    </KeyboardAvoidingView>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    summaryVal: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    summaryAmount: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    dividerVert: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
    },
    formCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 6,
    },
    req: {
      color: '#EF4444',
      fontWeight: '700',
    },
    dropdownSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    dropdownValRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    dropdownValText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
    },
    textInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    inputIcon: {
      marginRight: 10,
    },
    textInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    textAreaWrapper: {
      alignItems: 'flex-start',
      paddingVertical: 8,
    },
    textArea: {
      height: 90,
      paddingTop: 4,
    },
    itemsPreviewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    previewItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    previewItemIndex: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
      width: 22,
    },
    previewItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    previewItemMeta: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    previewItemSubtotal: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
    },
    submitBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 8,
    },
  });

export default PurchaseProcessScreen;
