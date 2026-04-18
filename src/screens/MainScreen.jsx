import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeDropdown } from '@components/common';
import { logout, selectCurrentUser } from '@store/slices/authSlice';
import { useTheme } from '@config/useTheme';
import { useToggleErpStatusMutation } from '@api/baseApi';
import Toast from 'react-native-toast-message';
import DailyActivitiesSlider from '@components/dashboard/DailyActivitiesSlider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_HEIGHT * 0.25;
const MAX_VISIBLE = 8;

/**
 * MainScreen - Professional ERP Dashboard with Grid Navigation
 */
const MainScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const company = useSelector(state => state.auth.company);

  const [toggleErpStatus] = useToggleErpStatusMutation();

  const [showMore, setShowMore] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);

  const handleToggleSystem = async () => {
    const newState = !systemEnabled;
    const activateValue = newState ? 0 : 1;

    try {
      const response = await toggleErpStatus({
        company: company,
        activate: activateValue,
      }).unwrap();

      if (response && response.status === true) {
        setSystemEnabled(newState);
        Toast.show({
          type: 'success',
          text1: 'System Updated',
          text2: `Application is now turned ${newState ? 'ON' : 'OFF'}.`,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Action Failed',
          text2: 'Could not change system status.',
        });
      }
    } catch (error) {
      console.log('Toggle ERP Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Network error occurred.',
      });
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const menuItems = [
    {
      id: 'Dashboard',
      name: 'Dashboard',
      icon: 'grid-outline',
      screen: 'Dashboard',
    },
    {
      id: 'Approvals',
      name: 'Approvals',
      icon: 'checkmark-circle-outline',
      screen: 'Approvals',
    },
    { id: 'Sales', name: 'Sales', icon: 'cart-outline', screen: 'Sales' },
    {
      id: 'Purchase',
      name: 'Purchase',
      icon: 'bag-handle-outline',
      screen: 'Purchase',
    },
    {
      id: 'Inventory',
      name: 'Inventory',
      icon: 'cube-outline',
      screen: 'Inventory',
    },
    { id: 'HCM', name: 'HCM', icon: 'people-outline', screen: 'HCM' },
    {
      id: 'Manufacturing',
      name: 'Manufacturing',
      icon: 'settings-outline',
      screen: 'Manufacturing',
    },
    { id: 'CRM', name: 'CRM', icon: 'business-outline', screen: 'CRM' },
    { id: 'Finance', name: 'Finance', icon: 'cash-outline', screen: 'Finance' },
    {
      id: 'Reporting',
      name: 'Reporting',
      icon: 'bar-chart-outline',
      screen: 'Reporting',
    },
    {
      id: 'VoidTransactions',
      name: 'Reversal Transactions',
      icon: 'refresh-circle-outline',
      screen: 'VoidTransactions',
    },
  ];

  const visibleItems = menuItems.slice(0, MAX_VISIBLE);
  const extraItems = menuItems.slice(MAX_VISIBLE);
  const hasMore = extraItems.length > 0;

  const dynamicStyles = getStyles(theme);

  const renderTile = item => (
    <TouchableOpacity
      key={item.id}
      style={dynamicStyles.gridBox}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={dynamicStyles.iconContainer}>
        <Icon name={item.icon} size={30} color={theme.colors.primary} />
      </View>
      <Text style={dynamicStyles.boxName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={dynamicStyles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Custom Header Section */}
      <View style={dynamicStyles.header}>
        <SafeAreaView style={dynamicStyles.headerContent} edges={['top']}>
          <View style={dynamicStyles.topBar}>
            <View style={dynamicStyles.companyInfo}>
              <Text style={dynamicStyles.companyName}>Desolutions</Text>
            </View>
            <View style={dynamicStyles.headerActions}>
              {/* On/Off Toggle Button */}
              {/* On/Off Power Toggle Icon */}
              <TouchableOpacity
                style={dynamicStyles.iconBtn}
                onPress={handleToggleSystem}
              >
                <Icon
                  name={systemEnabled ? 'power' : 'power-outline'}
                  size={24}
                  color={systemEnabled ? '#4ADE80' : 'rgba(255,255,255,0.5)'}
                />
              </TouchableOpacity>

              {/* Notification Bell */}
              <TouchableOpacity style={dynamicStyles.iconBtn}>
                <Icon name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Theme Switcher */}
              <View style={dynamicStyles.themeIcon}>
                <ThemeDropdown />
              </View>

              {/* Logout */}
              <TouchableOpacity
                style={[dynamicStyles.iconBtn, dynamicStyles.logoutBtn]}
                onPress={handleLogout}
              >
                <Icon name="log-out-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={dynamicStyles.userInfoContainer}>
            <Text style={dynamicStyles.userName}>
              Welcome back, {user?.real_name || 'User'}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Grid Section */}
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.gridContainer}>
          {/* First 9 visible tiles */}
          {visibleItems.map(renderTile)}

          {/* MORE button — only shown if there are extra items */}
          {hasMore && !showMore && (
            <TouchableOpacity
              style={[dynamicStyles.gridBox, dynamicStyles.moreBox]}
              activeOpacity={0.7}
              onPress={() => setShowMore(true)}
            >
              <View
                style={[
                  dynamicStyles.iconContainer,
                  { backgroundColor: theme.colors.primary + '15' },
                ]}
              >
                <Icon
                  name="ellipsis-horizontal-circle-outline"
                  size={30}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={dynamicStyles.boxName}>More</Text>
              {extraItems.length > 0 && (
                <View
                  style={[
                    dynamicStyles.moreBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={dynamicStyles.moreBadgeText}>
                    {extraItems.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Extra items shown after pressing More */}
          {showMore && extraItems.map(renderTile)}

          {/* Less button — shown when expanded */}
          {showMore && (
            <TouchableOpacity
              style={[dynamicStyles.gridBox, dynamicStyles.moreBox]}
              activeOpacity={0.7}
              onPress={() => setShowMore(false)}
            >
              <View style={dynamicStyles.iconContainer}>
                <Icon
                  name="chevron-up-circle-outline"
                  size={30}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={dynamicStyles.boxName}>Less</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Activities Slider */}
        <DailyActivitiesSlider />
      </ScrollView>
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      height: HEADER_HEIGHT,
      backgroundColor: theme.colors.primary,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      ...theme.shadows.lg,
    },
    headerContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    userName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    userInfoContainer: {
      marginTop: 20,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 4,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    iconBtn: {
      padding: 8,
      marginLeft: 4,
    },
    themeIcon: {
      width: 'auto',
      marginLeft: 4,
    },
    logoutBtn: {
      marginLeft: 8,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 30,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    gridBox: {
      width: '31%',
      aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      ...theme.shadows.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    moreBox: {
      borderStyle: 'dashed',
      borderColor: theme.colors.primary,
      position: 'relative',
    },
    moreBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    boxName: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
  });

export default MainScreen;
