import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '@config/useTheme';
import {
  useGetDebtorsMasterQuery,
  useSubmitSalesOrderMutation,
} from '@api/salesApi';
import {
  clearCart,
  selectCartItems,
  selectCartGrandTotal,
} from '@store/slices/cartSlice';
import { CustomDatePicker, SearchableSelectDropdown } from '@components/common';

const ORDER_TYPES = [
  { label: 'Sales Order', value: '30' },
  { label: 'Sales Quotation', value: '32' },
  { label: 'Sales Delivery', value: '13' },
  { label: 'Sales Invoice', value: '10' },
  { label: 'Credit Note', value: '11' },
];

const SalesProcessScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const company = useSelector(state => state.auth.company);
  const currentUser = useSelector(state => state.auth.user);

  // Cart from Redux
  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartGrandTotal);

  // RTK Query: Debtors List & Submit Order
  const { data: debtors = [], isLoading: isDebtorsLoading } =
    useGetDebtorsMasterQuery({ company }, { skip: !company });
  const [submitSalesOrder, { isLoading: isSubmitting }] =
    useSubmitSalesOrderMutation();

  // Form State
  const [transType, setTransType] = useState('30'); // Default: Sales Order (30)
  const [selectedDebtor, setSelectedDebtor] = useState(null);
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

  // Modals
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showDebtorModal, setShowDebtorModal] = useState(false);
  const [debtorSearchQuery, setDebtorSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const s = useMemo(() => getStyles(theme), [theme]);

  // Selected Order Type Label
  const selectedOrderTypeObj = useMemo(
    () => ORDER_TYPES.find(t => t.value === transType) || ORDER_TYPES[0],
    [transType],
  );

  // Filtered Debtors for Searchable Modal
  const filteredDebtors = useMemo(() => {
    if (!debtorSearchQuery.trim()) return debtors;
    const q = debtorSearchQuery.toLowerCase();
    return debtors.filter(
      d =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.debtor_ref && d.debtor_ref.toLowerCase().includes(q)) ||
        (d.debtor_no && String(d.debtor_no).includes(q)) ||
        (d.contact_no && String(d.contact_no).includes(q)),
    );
  }, [debtors, debtorSearchQuery]);

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

    if (!selectedDebtor) {
      Toast.show({
        type: 'error',
        text1: 'Customer Required',
        text2: 'Please select a Customer / Debtor.',
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
        person_id: selectedDebtor.debtor_no,
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

      const res = await submitSalesOrder(payload).unwrap();

      if (res?.success) {
        Toast.show({
          type: 'success',
          text1: 'Order Submitted',
          text2: res.message || 'Sales order processed successfully!',
        });
        dispatch(clearCart());
        navigation.navigate('Sales');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Submission Failed',
          text2: res?.message || 'Could not process sales order.',
        });
      }
    } catch (error) {
      console.log('Sales order submission error:', error);
      Toast.show({
        type: 'error',
        text1: 'Submission Error',
        text2: error?.message || 'Failed to submit sales order.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Order Details */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>Order Information</Text>

          {/* 1. Order Type Dropdown */}
          <SearchableSelectDropdown
            label="Order Type (Trans Type)"
            required
            icon="document-text-outline"
            items={ORDER_TYPES.map(t => ({
              id: t.value,
              value: t.value,
              name: t.label,
              subtitle: `Type Code: ${t.value}`,
            }))}
            selectedId={transType}
            onSelect={it => setTransType(it.id)}
            searchable={false}
          />

          {/* 2. Customer / Debtor Dropdown */}
          <SearchableSelectDropdown
            label="Customer / Debtor (Person ID)"
            required
            placeholder="Select Customer / Debtor"
            searchPlaceholder="Search by name, ref, or ID..."
            icon="person-outline"
            items={debtors.map(d => ({
              id: String(d.debtor_no),
              debtor_no: String(d.debtor_no),
              name: d.name,
              debtor_ref: d.debtor_ref || '',
              contact_no: d.contact_no || '',
              cnic: d.cnic || '',
            }))}
            selectedId={selectedDebtor?.debtor_no}
            onSelect={it => setSelectedDebtor(it)}
            isLoading={isDebtorsLoading}
            searchable={true}
            renderSubtitle={it => {
              const parts = [`ID: #${it.debtor_no}`];
              if (it.debtor_ref) parts.push(`Ref: ${it.debtor_ref}`);
              if (it.contact_no) parts.push(`Ph: ${it.contact_no}`);
              return parts.join(' | ');
            }}
          />

          {/* 3. Date & PO Number Row */}
          <View style={s.rowFields}>
            {/* Date Field */}
            <View style={s.halfCol}>
              <Text style={s.fieldLabel}>Date</Text>
              <TouchableOpacity
                style={s.dropdownSelector}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={s.selectorLeft}>
                  <Icon
                    name="calendar-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={s.dateValueText}>
                    {formatDateDisplay(ordDate)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* PO Number Field */}
            <View style={s.halfCol}>
              <Text style={s.fieldLabel}>PO No</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.textInput}
                  placeholder="1234"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={poNo}
                  onChangeText={setPoNo}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Driver & Transport Details */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>Transport & Logistics</Text>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Driver Name</Text>
            <View style={s.inputWrapper}>
              <Icon
                name="person-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={s.textInput}
                placeholder="Enter driver name"
                placeholderTextColor={theme.colors.textSecondary}
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>
          </View>

          <View style={s.rowFields}>
            <View style={s.halfCol}>
              <Text style={s.fieldLabel}>Driver CNIC</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.textInput}
                  placeholder="320002..."
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  value={driverCnic}
                  onChangeText={setDriverCnic}
                />
              </View>
            </View>

            <View style={s.halfCol}>
              <Text style={s.fieldLabel}>Vehicle No</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.textInput}
                  placeholder="123456"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={vehicleNo}
                  onChangeText={setVehicleNo}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Section 3: Comments / Special Note */}
        <View style={s.card}>
          <Text style={s.cardSectionTitle}>Special Note / Comments</Text>
          <View style={s.commentsWrapper}>
            <TextInput
              style={s.commentsInput}
              placeholder="Enter special instructions or order notes..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline={true}
              numberOfLines={4}
              value={comments}
              onChangeText={setComments}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Section 4: Cart Items Summary */}
        <View style={s.card}>
          <View style={s.summaryHeader}>
            <Text style={s.cardSectionTitle}>
              Order Items ({cartItems.length})
            </Text>
            <Text style={s.summaryTotalHeader}>
              PKR {Number(cartTotal).toLocaleString()}
            </Text>
          </View>

          {cartItems.map((item, idx) => (
            <View key={item.id || idx} style={s.summaryItemRow}>
              <View style={s.summaryItemLeft}>
                <Text style={s.summaryItemName} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={s.summaryItemSub}>
                  Stock #{item.stock_id} • {item.quantity} {item.units} × PKR{' '}
                  {Number(item.rate).toLocaleString()}
                </Text>
              </View>
              <Text style={s.summaryItemPrice}>
                PKR {Number(item.total).toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={s.grandTotalDivider} />

          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Grand Total (PKR):</Text>
            <Text style={s.grandTotalValue}>
              PKR{' '}
              {Number(cartTotal).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Submit Order Button */}
        <TouchableOpacity
          style={[s.submitButton, isSubmitting && s.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="checkmark-done" size={22} color="#FFFFFF" />
              <Text style={s.submitButtonText}>Submit Order</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.bottomSpacer} />
      </ScrollView>



      {/* Modal 3: Custom Date Picker */}
      <CustomDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={date => {
          if (date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            setOrdDate(`${yyyy}-${mm}-${dd}`);
          }
          setShowDatePicker(false);
        }}
        selectedDate={new Date(ordDate)}
        title="Select Order Date"
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
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows?.sm,
    },
    cardSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 14,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    rowFields: {
      flexDirection: 'row',
      gap: 12,
    },
    halfCol: {
      flex: 1,
    },
    dropdownSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 48,
    },
    dropdownSelectorPlaceholder: {
      borderColor: theme.colors.border + '80',
    },
    selectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 6,
    },
    selectorValueText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
      fontWeight: '400',
    },
    dateValueText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 48,
      gap: 8,
    },
    textInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    commentsWrapper: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      minHeight: 90,
    },
    commentsInput: {
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 0,
      minHeight: 70,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryTotalHeader: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    summaryItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
    },
    summaryItemLeft: {
      flex: 1,
      marginRight: 12,
    },
    summaryItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    summaryItemSub: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    summaryItemPrice: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
    },
    grandTotalDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    grandTotalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      height: 52,
      borderRadius: 16,
      marginTop: 4,
      marginBottom: 20,
      ...theme.shadows?.md,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    bottomSpacer: {
      height: 30,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    dropdownModalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      borderColor: theme.colors.border,
      borderWidth: 1,
      ...theme.shadows?.lg,
    },
    dropdownModalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 14,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dropdownOptionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
    },
    dropdownOptionSelected: {
      backgroundColor: theme.colors.primary + '15',
    },
    dropdownOptionText: {
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '500',
    },
    dropdownOptionTextSelected: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    modalOverlayBottom: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    debtorModalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '75%',
      padding: 16,
    },
    debtorModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    debtorModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    debtorSearchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 12,
      gap: 8,
    },
    debtorSearchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    debtorItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '30',
    },
    debtorItemSelected: {
      backgroundColor: theme.colors.primary + '15',
    },
    debtorAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    debtorAvatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    debtorInfoCol: {
      flex: 1,
      marginRight: 8,
    },
    debtorName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    debtorSub: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    debtorContact: {
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 1,
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 10,
    },
  });

export default SalesProcessScreen;
