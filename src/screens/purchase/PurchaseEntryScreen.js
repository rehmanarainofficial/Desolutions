import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Keyboard,
  Vibration,
  Platform,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '@config/useTheme';
import { useGetPurchaseStockMasterDetailMutation } from '@api/purchaseApi';
import {
  addToPurchaseCart,
  removeFromPurchaseCart,
  clearPurchaseCart,
  selectPurchaseCartItems,
  selectPurchaseCartItemCount,
  selectPurchaseCartGrandTotal,
} from '@store/slices/purchaseCartSlice';

const PurchaseEntryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const company = useSelector(state => state.auth.company);

  // Redux Purchase Cart Selectors
  const cartItems = useSelector(selectPurchaseCartItems);
  const cartCount = useSelector(selectPurchaseCartItemCount);
  const cartTotal = useSelector(selectPurchaseCartGrandTotal);

  // RTK Query Mutation
  const [getPurchaseStockMasterDetail, { isLoading }] =
    useGetPurchaseStockMasterDetailMutation();

  // Local state
  const [stockIdInput, setStockIdInput] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [rate, setRate] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(true);

  // Scanner animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const s = useMemo(() => getStyles(theme), [theme]);

  // Scanner laser animation loop
  useEffect(() => {
    let animation;
    if (isScannerActive) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isScannerActive, scanLineAnim]);

  // Set header cart button with badge
  const renderHeaderRight = useCallback(
    () => (
      <TouchableOpacity
        style={s.headerCartButton}
        onPress={() => setShowCartModal(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="cart-outline" size={24} color="#FFFFFF" />
        {cartCount > 0 && (
          <View style={s.headerCartBadge}>
            <Text style={s.headerCartBadgeText}>
              {cartCount > 99 ? '99+' : cartCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    [cartCount, s.headerCartButton, s.headerCartBadge, s.headerCartBadgeText],
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Purchase Entry',
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  // Fetch product by stock_id
  const handleFetchProduct = useCallback(
    async idToFetch => {
      const targetId = String(idToFetch || stockIdInput).trim();
      if (!targetId) {
        Toast.show({
          type: 'error',
          text1: 'Stock ID Required',
          text2: 'Please enter or scan a Stock ID',
        });
        return;
      }

      if (!company) {
        Toast.show({
          type: 'error',
          text1: 'Company Missing',
          text2: 'Please log in again with a valid company',
        });
        return;
      }

      Keyboard.dismiss();

      try {
        const result = await getPurchaseStockMasterDetail({
          company,
          stock_id: targetId,
        }).unwrap();

        if (result?.success && result.product) {
          setCurrentProduct(result.product);
          // Set default rate if product has price, otherwise blank
          setRate(result.product.price ? String(result.product.price) : '');
          setQuantity('1');

          // Haptic feedback
          try {
            Vibration.vibrate(Platform.OS === 'ios' ? 50 : 100);
          } catch (e) {
            // ignore
          }

          Toast.show({
            type: 'success',
            text1: 'Product Found',
            text2: result.product.description || `Stock #${targetId}`,
          });
        } else {
          setCurrentProduct(null);
          Toast.show({
            type: 'error',
            text1: 'Not Found',
            text2:
              result?.message || `No item found for Stock ID "${targetId}"`,
          });
        }
      } catch (error) {
        console.log('Error fetching stock detail:', error);
        setCurrentProduct(null);
        Toast.show({
          type: 'error',
          text1: 'Search Failed',
          text2: error?.message || 'Failed to fetch product details',
        });
      }
    },
    [stockIdInput, company, getPurchaseStockMasterDetail],
  );

  // Stepper increment/decrement
  const handleAdjustQuantity = delta => {
    const current = parseFloat(quantity) || 0;
    const next = Math.max(1, current + delta);
    setQuantity(String(next));
  };

  // Add to cart handler
  const handleAddToCart = () => {
    if (!currentProduct) {
      Toast.show({
        type: 'error',
        text1: 'No Product Selected',
        text2: 'Please scan or search a product first',
      });
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (!qtyNum || qtyNum <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Quantity',
        text2: 'Please enter a valid quantity greater than 0',
      });
      return;
    }

    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum < 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Rate',
        text2: 'Please enter a valid rate/price',
      });
      return;
    }

    dispatch(
      addToPurchaseCart({
        stock_id: currentProduct.stock_id,
        description: currentProduct.description || 'Product Item',
        cat_name: currentProduct.cat_name || '',
        units: currentProduct.units || currentProduct.unit_name || 'units',
        quantity: qtyNum,
        rate: rateNum,
        qoh: currentProduct.qoh || '0',
      }),
    );

    Toast.show({
      type: 'success',
      text1: 'Added to Cart',
      text2: `${qtyNum} × ${currentProduct.description} added!`,
    });

    try {
      Vibration.vibrate(Platform.OS === 'ios' ? 70 : 150);
    } catch (e) {
      // ignore
    }
  };

  // Subtotal calculation
  const subtotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    return (q * r).toFixed(2);
  }, [quantity, rate]);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Scanner Viewfinder Card */}
        <View style={s.scannerCard}>
          <View style={s.scannerHeader}>
            <View style={s.scannerHeaderLeft}>
              <Icon name="scan" size={20} color={theme.colors.primary} />
              <Text style={s.scannerTitle}>Barcode Scanner</Text>
            </View>
            <TouchableOpacity
              style={s.scannerModeToggle}
              onPress={() => setIsScannerActive(!isScannerActive)}
            >
              <Icon
                name={isScannerActive ? 'eye' : 'eye-off'}
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={s.scannerModeText}>
                {isScannerActive ? 'Active' : 'Paused'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Viewfinder Target Area */}
          <View style={s.viewfinderBox}>
            {/* Corner Target Markers */}
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />

            {/* Scanning Laser Line */}
            {isScannerActive && (
              <Animated.View
                style={[
                  s.scanLaser,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 130],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            <Icon
              name="barcode-outline"
              size={64}
              color={theme.colors.textSecondary + '40'}
            />
            <Text style={s.viewfinderHint}>
              Align barcode inside frame or enter Stock ID below
            </Text>
          </View>
        </View>

        {/* Manual Stock ID Input Bar */}
        <View style={s.inputSection}>
          <Text style={s.inputLabel}>Stock ID / Barcode</Text>
          <View style={s.searchBarRow}>
            <View style={s.searchBar}>
              <Icon
                name="barcode-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={s.textInput}
                placeholder="Enter Stock ID (10001)"
                placeholderTextColor={theme.colors.textSecondary}
                value={stockIdInput}
                onChangeText={setStockIdInput}
                keyboardType="default"
                returnKeyType="search"
                onSubmitEditing={() => handleFetchProduct(stockIdInput)}
              />
              {stockIdInput ? (
                <TouchableOpacity
                  onPress={() => setStockIdInput('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon
                    name="close-circle"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[s.searchButton, isLoading && s.buttonDisabled]}
              onPress={() => handleFetchProduct(stockIdInput)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="search" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Preset Chip */}
          <View style={s.presetsRow}>
            <Text style={s.presetLabel}>Quick test:</Text>
            <TouchableOpacity
              style={s.presetChip}
              onPress={() => {
                setStockIdInput('10001');
                handleFetchProduct('10001');
              }}
            >
              <Text style={s.presetChipText}>#10001</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={s.loadingText}>Fetching product details...</Text>
          </View>
        )}

        {/* Product Details Display Card */}
        {currentProduct && !isLoading && (
          <View style={s.productCard}>
            {/* Card Header */}
            <View style={s.productHeader}>
              <View style={s.productHeaderLeft}>
                <Text style={s.productTitle}>
                  {currentProduct.description || 'Product Details'}
                </Text>
                <View style={s.stockIdBadge}>
                  <Text style={s.stockIdBadgeText}>
                    Stock #{currentProduct.stock_id}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor:
                      currentProduct.inactive === '0'
                        ? theme.colors.success + '20'
                        : theme.colors.error + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    s.statusPillText,
                    {
                      color:
                        currentProduct.inactive === '0'
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {currentProduct.inactive === '0' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={s.cardDivider} />

            {/* Product Metadata Grid */}
            <View style={s.specGrid}>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Category</Text>
                <Text style={s.specValue} numberOfLines={1}>
                  {currentProduct.cat_name || 'N/A'}
                </Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Unit</Text>
                <Text style={s.specValue}>
                  {currentProduct.units || currentProduct.unit_name || 'boxes'}
                </Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Tax Type</Text>
                <Text style={s.specValue}>
                  {currentProduct.tax_type_name || 'Standard'}
                </Text>
              </View>
              <View style={s.specItem}>
                <Text style={s.specLabel}>Stock on Hand (QOH)</Text>
                <View
                  style={[
                    s.qohBadge,
                    {
                      backgroundColor:
                        parseFloat(currentProduct.qoh) > 0
                          ? theme.colors.success + '15'
                          : theme.colors.error + '15',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.qohText,
                      {
                        color:
                          parseFloat(currentProduct.qoh) > 0
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {currentProduct.qoh || '0'} {currentProduct.units || ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.cardDivider} />

            {/* Add to Cart Inputs: Quantity & Rate */}
            <View style={s.cartForm}>
              <Text style={s.cartFormTitle}>Purchase Quantity & Rate</Text>

              <View style={s.formInputsRow}>
                {/* Quantity Input with Stepper */}
                <View style={s.formCol}>
                  <Text style={s.fieldLabel}>Quantity</Text>
                  <View style={s.stepperRow}>
                    <TouchableOpacity
                      style={s.stepperBtn}
                      onPress={() => handleAdjustQuantity(-1)}
                    >
                      <Icon name="remove" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TextInput
                      style={s.stepperInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <TouchableOpacity
                      style={s.stepperBtn}
                      onPress={() => handleAdjustQuantity(1)}
                    >
                      <Icon name="add" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Rate Input */}
                <View style={s.formCol}>
                  <Text style={s.fieldLabel}>Rate (Price)</Text>
                  <View style={s.rateInputWrapper}>
                    <TextInput
                      style={s.rateInput}
                      value={rate}
                      onChangeText={setRate}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Subtotal Preview */}
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Subtotal Amount:</Text>
                <Text style={s.subtotalValue}>
                  PKR{' '}
                  {Number(subtotal).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Add to Cart Button */}
              <TouchableOpacity
                style={s.addToCartButton}
                onPress={handleAddToCart}
                activeOpacity={0.8}
              >
                <Icon name="cart" size={20} color="#FFFFFF" />
                <Text style={s.addToCartButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.bottomPadding} />
      </ScrollView>

      {/* Cart Summary Bottom Bar (if items in cart) */}
      {cartCount > 0 && (
        <View style={s.cartBottomBar}>
          <TouchableOpacity
            style={s.cartBarInner}
            onPress={() => setShowCartModal(true)}
            activeOpacity={0.85}
          >
            <View style={s.cartBarLeft}>
              <View style={s.cartBarBadge}>
                <Icon name="cart" size={18} color="#FFFFFF" />
                <Text style={s.cartBarCountText}>{cartCount}</Text>
              </View>
              <View>
                <Text style={s.cartBarTotalLabel}>Cart Total</Text>
                <Text style={s.cartBarTotalValue}>
                  PKR{' '}
                  {Number(cartTotal).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
            <View style={s.viewCartBtn}>
              <Text style={s.viewCartBtnText}>View Cart</Text>
              <Icon name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal / Drawer */}
      <Modal
        visible={showCartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <Icon name="cart" size={22} color={theme.colors.primary} />
                <Text style={s.modalTitle}>Purchase Cart ({cartCount})</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCartModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Cart Items List */}
            {cartItems.length === 0 ? (
              <View style={s.emptyCartBox}>
                <Icon
                  name="cart-outline"
                  size={54}
                  color={theme.colors.textSecondary}
                />
                <Text style={s.emptyCartTitle}>Your Cart is Empty</Text>
                <Text style={s.emptyCartSubtitle}>
                  Scan or search products to add them to your purchase cart.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={s.cartItemsList}
                showsVerticalScrollIndicator={false}
              >
                {cartItems.map((item, idx) => (
                  <View key={item.id || idx} style={s.cartItemCard}>
                    <View style={s.cartItemTop}>
                      <View style={s.cartItemInfo}>
                        <Text style={s.cartItemName} numberOfLines={1}>
                          {item.description}
                        </Text>
                        <Text style={s.cartItemStock}>
                          Stock #{item.stock_id} • {item.cat_name || 'Item'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() =>
                          dispatch(removeFromPurchaseCart(item.id))
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon
                          name="trash-outline"
                          size={18}
                          color={theme.colors.error}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={s.cartItemBottom}>
                      <Text style={s.cartItemQty}>
                        {item.quantity} {item.units} × PKR{' '}
                        {Number(item.rate).toLocaleString()}
                      </Text>
                      <Text style={s.cartItemTotal}>
                        PKR {Number(item.total).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Modal Footer */}
            {cartItems.length > 0 && (
              <View style={s.modalFooter}>
                <View style={s.modalTotalRow}>
                  <Text style={s.modalTotalLabel}>Grand Total:</Text>
                  <Text style={s.modalTotalValue}>
                    PKR{' '}
                    {Number(cartTotal).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                <View style={s.modalButtonsRow}>
                  <TouchableOpacity
                    style={s.clearCartBtn}
                    onPress={() => dispatch(clearPurchaseCart())}
                  >
                    <Icon
                      name="trash-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                    <Text style={s.clearCartBtnText}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.checkoutBtn}
                    onPress={() => {
                      setShowCartModal(false);
                      navigation.navigate('PurchaseProcess');
                    }}
                  >
                    <Text style={s.checkoutBtnText}>Proceed to Order</Text>
                    <Icon name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
    headerCartButton: {
      marginRight: 10,
      position: 'relative',
      padding: 4,
    },
    headerCartBadge: {
      position: 'absolute',
      top: -2,
      right: -6,
      backgroundColor: theme.colors.error,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    headerCartBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    scannerCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows?.sm,
    },
    scannerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    scannerHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scannerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    scannerModeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: theme.colors.border + '40',
    },
    scannerModeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    viewfinderBox: {
      height: 160,
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: theme.colors.primary,
    },
    cornerTL: {
      top: 12,
      left: 12,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderTopLeftRadius: 6,
    },
    cornerTR: {
      top: 12,
      right: 12,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: 6,
    },
    cornerBL: {
      bottom: 12,
      left: 12,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: 6,
    },
    cornerBR: {
      bottom: 12,
      right: 12,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: 6,
    },
    scanLaser: {
      position: 'absolute',
      left: 20,
      right: 20,
      height: 2,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 5,
      elevation: 4,
    },
    viewfinderHint: {
      marginTop: 8,
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    inputSection: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    searchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 48,
      ...theme.shadows?.sm,
    },
    textInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 15,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    searchButton: {
      width: 48,
      height: 48,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows?.sm,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    presetsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    presetLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    presetChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '18',
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    loadingBox: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 8,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    productCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      ...theme.shadows?.sm,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    productHeaderLeft: {
      flex: 1,
      marginRight: 10,
    },
    productTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    stockIdBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.border + '60',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    stockIdBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    cardDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 14,
    },
    specGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    specItem: {
      width: '47%',
    },
    specLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    specValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    qohBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    qohText: {
      fontSize: 13,
      fontWeight: '700',
    },
    cartForm: {
      marginTop: 4,
    },
    cartFormTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    formInputsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    formCol: {
      flex: 1,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 12,
      height: 44,
      overflow: 'hidden',
    },
    stepperBtn: {
      width: 36,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.border + '30',
    },
    stepperInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      paddingVertical: 0,
    },
    rateInputWrapper: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 12,
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    rateInput: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      paddingVertical: 0,
    },
    subtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      marginBottom: 14,
    },
    subtotalLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    subtotalValue: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    addToCartButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      height: 46,
      borderRadius: 14,
      ...theme.shadows?.sm,
    },
    addToCartButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    bottomPadding: {
      height: 80,
    },
    cartBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...theme.shadows?.lg,
    },
    cartBarInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cartBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cartBarBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cartBarCountText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    cartBarTotalLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '600',
    },
    cartBarTotalValue: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    viewCartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    viewCartBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      padding: 16,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 12,
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    emptyCartBox: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyCartTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    emptyCartSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    cartItemsList: {
      maxHeight: 350,
    },
    cartItemCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 10,
    },
    cartItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    cartItemInfo: {
      flex: 1,
      marginRight: 8,
    },
    cartItemName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    cartItemStock: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    deleteBtn: {
      padding: 4,
    },
    cartItemBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '50',
    },
    cartItemQty: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    cartItemTotal: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    modalFooter: {
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      marginTop: 8,
    },
    modalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTotalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
    },
    modalTotalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    clearCartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.error + '40',
      backgroundColor: theme.colors.error + '10',
      paddingHorizontal: 16,
      height: 46,
      borderRadius: 14,
    },
    clearCartBtnText: {
      color: theme.colors.error,
      fontSize: 14,
      fontWeight: '700',
    },
    checkoutBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      height: 46,
      borderRadius: 14,
      ...theme.shadows?.sm,
    },
    checkoutBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });

export default PurchaseEntryScreen;
