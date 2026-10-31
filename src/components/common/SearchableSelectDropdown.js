import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@config/useTheme';

/**
 * Reusable SearchableSelectDropdown
 * Fully styled bottom-sheet modal dropdown matching Desolution design system.
 */
const SearchableSelectDropdown = ({
  label,
  required = false,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  icon = 'chevron-down-circle-outline',
  items = [],
  selectedId = null,
  onSelect = () => {},
  isLoading = false,
  searchable = true,
  renderSubtitle,
  style,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find currently selected item
  const selectedItem = useMemo(() => {
    return items.find(
      it =>
        String(it.id ?? it.value ?? it.supplier_id ?? it.debtor_no) ===
        String(selectedId),
    );
  }, [items, selectedId]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(it => {
      const name = String(it.name || it.label || '').toLowerCase();
      const id = String(
        it.id || it.value || it.supplier_id || it.debtor_no || '',
      ).toLowerCase();
      const ref = String(it.debtor_ref || it.ref || '').toLowerCase();
      const phone = String(it.contact_no || it.phone || '').toLowerCase();
      const cnic = String(it.cnic || '').toLowerCase();
      const sub = String(it.subtitle || '').toLowerCase();

      return (
        name.includes(q) ||
        id.includes(q) ||
        ref.includes(q) ||
        phone.includes(q) ||
        cnic.includes(q) ||
        sub.includes(q)
      );
    });
  }, [items, searchQuery]);

  const s = useMemo(() => getStyles(theme), [theme]);

  const handleOpen = () => {
    if (disabled) return;
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelect = item => {
    onSelect(item);
    setModalVisible(false);
  };

  return (
    <View style={[s.container, style]}>
      {label && (
        <Text style={s.label}>
          {label} {required && <Text style={s.req}>*</Text>}
        </Text>
      )}

      {/* Trigger Selector Button */}
      <TouchableOpacity
        style={[
          s.triggerBtn,
          modalVisible && s.triggerBtnActive,
          disabled && s.triggerBtnDisabled,
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <View style={s.triggerContent}>
          <View style={s.iconBox}>
            <Icon name={icon} size={18} color={theme.colors.primary} />
          </View>
          <Text
            style={[
              s.triggerText,
              !selectedItem && s.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedItem
              ? selectedItem.name || selectedItem.label
              : placeholder}
          </Text>
        </View>
        <Icon
          name="chevron-down"
          size={18}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          {/* Dimmed backdrop - click to close */}
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          {/* Solid Bottom Sheet Container */}
          <View style={s.modalSheet}>
            {/* Top Handle Bar */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            {searchable && (
              <View style={s.searchWrapper}>
                <Icon
                  name="search-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                  style={s.searchIcon}
                />
                <TextInput
                  style={s.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon
                      name="close-circle"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Items List */}
            {isLoading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={s.loadingText}>Loading options...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={s.emptyBox}>
                <Icon
                  name="file-tray-outline"
                  size={42}
                  color={theme.colors.textSecondary}
                />
                <Text style={s.emptyText}>No matches found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item, index) =>
                  String(
                    item.id ??
                      item.value ??
                      item.supplier_id ??
                      item.debtor_no ??
                      index,
                  )
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.listContent}
                ItemSeparatorComponent={() => <View style={s.divider} />}
                renderItem={({ item }) => {
                  const itemId = String(
                    item.id ?? item.value ?? item.supplier_id ?? item.debtor_no,
                  );
                  const isSelected = String(selectedId) === itemId;

                  // Subtitle logic
                  let subtitleText = '';
                  if (renderSubtitle) {
                    subtitleText = renderSubtitle(item);
                  } else if (item.subtitle) {
                    subtitleText = item.subtitle;
                  } else if (item.debtor_ref || item.supplier_id) {
                    const parts = [];
                    if (item.supplier_id || item.debtor_no) {
                      parts.push(`ID: #${item.supplier_id || item.debtor_no}`);
                    }
                    if (item.debtor_ref) {
                      parts.push(`Ref: ${item.debtor_ref}`);
                    }
                    if (item.contact_no) {
                      parts.push(`Ph: ${item.contact_no}`);
                    }
                    subtitleText = parts.join(' | ');
                  }

                  return (
                    <TouchableOpacity
                      style={[
                        s.itemRow,
                        isSelected && s.itemRowSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.65}
                    >
                      <View style={s.itemInfo}>
                        <Text
                          style={[
                            s.itemTitle,
                            isSelected && {
                              color: theme.colors.primary,
                              fontWeight: '700',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name || item.label}
                        </Text>
                        {!!subtitleText && (
                          <Text style={s.itemSubtitle} numberOfLines={1}>
                            {subtitleText}
                          </Text>
                        )}
                      </View>

                      {isSelected ? (
                        <Icon
                          name="checkmark-circle"
                          size={22}
                          color={theme.colors.primary}
                        />
                      ) : (
                        <Icon
                          name="chevron-forward"
                          size={18}
                          color={theme.colors.border}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
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
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 6,
    },
    req: {
      color: '#EF4444',
      fontWeight: '700',
    },
    triggerBtn: {
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
    triggerBtnActive: {
      borderColor: theme.colors.primary,
    },
    triggerBtnDisabled: {
      opacity: 0.6,
    },
    triggerContent: {
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
    triggerText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    placeholderText: {
      color: theme.colors.textSecondary,
      fontWeight: '400',
    },

    // Modal Bottom Sheet
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 36 : 20,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    },
    handle: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: 0.3,
    },
    closeBtn: {
      padding: 4,
    },

    // Search bar
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      marginBottom: 14,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      padding: 0,
    },

    // Items List
    listContent: {
      paddingBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border + '60',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    itemRowSelected: {
      backgroundColor: theme.colors.primary + '15',
    },
    itemInfo: {
      flex: 1,
      marginRight: 12,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    itemSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },

    // States
    loadingBox: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 10,
    },
    emptyBox: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 10,
    },
  });

export default SearchableSelectDropdown;

