import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '@config/useTheme';
import { useGetUsersQuery, useUpdateUserStatusMutation } from '@api/authApi';
import { APP_VERSION, isVersionOutdated } from '../../utils/AppVersion';

const UserStatusScreen = () => {
  const { theme } = useTheme();
  const company = useSelector(state => state.auth.company);
  const currentUser = useSelector(state => state.auth.user);

  // RTK Query: fetch users and status update mutation
  const {
    data: fetchedUsers = [],
    isLoading: loading,
    refetch,
  } = useGetUsersQuery({ company }, { skip: !company });

  const [updateUserStatus] = useUpdateUserStatusMutation();

  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [updatingIds, setUpdatingIds] = useState({});

  const s = useMemo(() => getStyles(theme), [theme]);

  // Sync RTK Query data with local state for optimistic updates
  useEffect(() => {
    if (fetchedUsers) {
      setUsers(fetchedUsers);
    }
  }, [fetchedUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggleLoginStatus = async user => {
    const userId = user.id;
    if (updatingIds[userId]) return;

    const currentStatus = String(user.login_status || '0');
    const newStatus = currentStatus === '0' ? '1' : '0';

    setUpdatingIds(prev => ({ ...prev, [userId]: true }));

    // Optimistic UI update
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === userId ? { ...u, login_status: newStatus } : u,
      ),
    );

    try {
      const responseData = await updateUserStatus({
        id: userId,
        company,
        inactive: String(user.inactive || '0'),
        login_status: newStatus,
        login_active_status: '0',
        app_version: String(user.app_version || ''),
      }).unwrap();

      if (
        responseData &&
        (responseData.status === 'true' || responseData.status === true)
      ) {
        Toast.show({
          type: 'success',
          text1: 'Status Updated',
          text2: `${user.real_name || user.user_id} login status set to ${
            newStatus === '0' ? 'Logged In' : 'Logged Out'
          }.`,
        });
      } else {
        // Rollback
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === userId ? { ...u, login_status: currentStatus } : u,
          ),
        );
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: responseData?.message || 'Could not update login status.',
        });
      }
    } catch (error) {
      console.log('Error updating login status:', error);
      // Rollback
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, login_status: currentStatus } : u,
        ),
      );
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: error?.data?.message || error?.message || 'Failed to update login status.',
      });
    } finally {
      setUpdatingIds(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleToggleActiveStatus = async user => {
    const userId = user.id;
    if (updatingIds[userId]) return;

    const currentInactive = String(user.inactive || '0');
    const newInactive = currentInactive === '0' ? '1' : '0';

    setUpdatingIds(prev => ({ ...prev, [userId]: true }));

    // Optimistic UI update
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === userId ? { ...u, inactive: newInactive } : u,
      ),
    );

    try {
      const responseData = await updateUserStatus({
        id: userId,
        company,
        inactive: newInactive,
        login_status: String(user.login_status || '0'),
        login_active_status: '1',
        app_version: String(user.app_version || ''),
      }).unwrap();

      if (
        responseData &&
        (responseData.status === 'true' || responseData.status === true)
      ) {
        Toast.show({
          type: 'success',
          text1: 'Status Updated',
          text2: `${user.real_name || user.user_id} is now ${
            newInactive === '0' ? 'Active' : 'Inactive'
          }.`,
        });
      } else {
        // Rollback
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === userId ? { ...u, inactive: currentInactive } : u,
          ),
        );
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: responseData?.message || 'Could not update active status.',
        });
      }
    } catch (error) {
      console.log('Error updating active status:', error);
      // Rollback
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, inactive: currentInactive } : u,
        ),
      );
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: error?.data?.message || error?.message || 'Failed to update active status.',
      });
    } finally {
      setUpdatingIds(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const counts = useMemo(() => {
    let loggedIn = 0;
    let loggedOut = 0;
    let active = 0;
    let inactive = 0;

    users.forEach(u => {
      if (String(u.login_status) === '0') loggedIn++;
      else loggedOut++;

      if (String(u.inactive) === '0') active++;
      else inactive++;
    });

    return {
      total: users.length,
      loggedIn,
      loggedOut,
      active,
      inactive,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (user.real_name && user.real_name.toLowerCase().includes(q)) ||
        (user.user_id && user.user_id.toLowerCase().includes(q)) ||
        (user.emp_code && String(user.emp_code).toLowerCase().includes(q)) ||
        (user.phone && String(user.phone).includes(q));

      if (!matchesSearch) return false;

      if (filterType === 'login') return String(user.login_status) === '0';
      if (filterType === 'logout') return String(user.login_status) === '1';
      if (filterType === 'active') return String(user.inactive) === '0';
      if (filterType === 'inactive') return String(user.inactive) === '1';

      return true;
    });
  }, [users, searchQuery, filterType]);

  const renderFilterChip = (type, label, count) => {
    const isSelected = filterType === type;
    return (
      <TouchableOpacity
        key={type}
        style={[
          s.filterChip,
          isSelected && s.filterChipActive,
        ]}
        onPress={() => setFilterType(type)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            s.filterChipText,
            isSelected && s.filterChipTextActive,
          ]}
        >
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }) => {
    const isLogin = String(item.login_status) === '0';
    const isActive = String(item.inactive) === '0';
    const isUpdating = !!updatingIds[item.id];
    const isCurrentLoggedInUser =
      String(currentUser?.id) === String(item.id) ||
      String(currentUser?.user_id || '').toLowerCase() === String(item.user_id || '').toLowerCase();

    const minRequiredVersion =
      item.min_required_version || users[0]?.min_required_version;
    const isOutdated = minRequiredVersion
      ? isVersionOutdated(item.app_version || '1.0', minRequiredVersion)
      : false;

    return (
      <View style={s.userCard}>
        <View style={s.cardTopRow}>
          <View style={s.avatarContainer}>
            <View
              style={[
                s.avatarCircle,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary + '20'
                    : theme.colors.error + '20',
                  borderColor: isActive ? theme.colors.primary : theme.colors.error,
                },
              ]}
            >
              <Text
                style={[
                  s.avatarText,
                  { color: isActive ? theme.colors.primary : theme.colors.error },
                ]}
              >
                {(item.real_name || item.user_id || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                s.statusDot,
                {
                  backgroundColor: !isActive
                    ? theme.colors.error
                    : isLogin
                    ? theme.colors.success
                    : theme.colors.textSecondary,
                },
              ]}
            />
          </View>

          <View style={s.userInfo}>
            <View style={s.nameRow}>
              <Text style={s.realName} numberOfLines={1}>
                {item.real_name || 'No Name'}
              </Text>
              {isCurrentLoggedInUser ? (
                <View style={[s.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[s.badgeText, { color: theme.colors.primary }]}>You</Text>
                </View>
              ) : null}
              {item.emp_code ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>#{item.emp_code}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.userSubRow}>
              <Text style={s.usernameText}>@{item.user_id}</Text>
              <View
                style={[
                  s.versionBadge,
                  isOutdated && {
                    backgroundColor: theme.colors.error + '15',
                    borderColor: theme.colors.error + '40',
                  },
                ]}
              >
                <Icon
                  name={isOutdated ? 'alert-circle' : 'phone-portrait-outline'}
                  size={11}
                  color={isOutdated ? theme.colors.error : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    s.versionText,
                    isOutdated && s.versionTextOutdated,
                  ]}
                >
                  {item.app_version
                    ? `v${item.app_version}${isOutdated ? ' (Old)' : ''}`
                    : `v${APP_VERSION}`}
                </Text>
              </View>
            </View>

            <View style={s.metaRow}>
              {item.phone ? (
                <View style={s.metaItem}>
                  <Icon name="call-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={s.metaText}>{item.phone}</Text>
                </View>
              ) : null}
              {item.email ? (
                <View style={s.metaItem}>
                  <Icon name="mail-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={s.metaText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {isUpdating && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={s.inlineLoader}
            />
          )}
        </View>

        <View style={s.divider} />

        {/* Controls Row */}
        <View style={s.controlsRow}>
          {/* Login Status Toggle */}
          <TouchableOpacity
            style={[
              s.checkboxContainer,
              {
                backgroundColor: isLogin
                  ? theme.colors.success + '15'
                  : theme.colors.surface,
                borderColor: isLogin
                  ? theme.colors.success + '40'
                  : theme.colors.border,
              },
            ]}
            disabled={isUpdating}
            onPress={() => handleToggleLoginStatus(item)}
            activeOpacity={0.7}
          >
            <Icon
              name={isLogin ? 'checkbox' : 'square-outline'}
              size={20}
              color={isLogin ? theme.colors.success : theme.colors.textSecondary}
            />
            <View style={s.checkboxLabelContainer}>
              <Text style={s.controlLabel}>Login Status</Text>
              <Text
                style={[
                  s.controlValue,
                  { color: isLogin ? theme.colors.success : theme.colors.textSecondary },
                ]}
              >
                {isLogin ? 'Logged In' : 'Logged Out'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* User Status Toggle (Active / Inactive) */}
          <TouchableOpacity
            style={[
              s.checkboxContainer,
              {
                backgroundColor: isActive
                  ? theme.colors.primary + '15'
                  : theme.colors.error + '15',
                borderColor: isActive
                  ? theme.colors.primary + '40'
                  : theme.colors.error + '40',
              },
            ]}
            disabled={isUpdating}
            onPress={() => handleToggleActiveStatus(item)}
            activeOpacity={0.7}
          >
            <Icon
              name={isActive ? 'checkbox' : 'square-outline'}
              size={20}
              color={isActive ? theme.colors.primary : theme.colors.error}
            />
            <View style={s.checkboxLabelContainer}>
              <Text style={s.controlLabel}>User Status</Text>
              <Text
                style={[
                  s.controlValue,
                  { color: isActive ? theme.colors.primary : theme.colors.error },
                ]}
              >
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Summary Stat Cards */}
      <View style={s.statsContainer}>
        <View style={s.statBox}>
          <Text style={s.statNumber}>{counts.total}</Text>
          <Text style={s.statLabel}>Total Users</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statNumber, { color: theme.colors.success }]}>
            {counts.loggedIn}
          </Text>
          <Text style={s.statLabel}>Logged In</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statNumber, { color: theme.colors.primary }]}>
            {counts.active}
          </Text>
          <Text style={s.statLabel}>Active</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={s.searchWrapper}>
        <View style={s.searchBar}>
          <Icon name="search-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, emp code, user id..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={s.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterChipsContainer}
        >
          {renderFilterChip('all', 'All', counts.total)}
          {renderFilterChip('login', 'Logged In', counts.loggedIn)}
          {renderFilterChip('logout', 'Logged Out', counts.loggedOut)}
          {renderFilterChip('active', 'Active', counts.active)}
          {renderFilterChip('inactive', 'Inactive', counts.inactive)}
        </ScrollView>
      </View>

      {/* User Cards List */}
      {loading ? (
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={s.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => String(item.id || item.user_id)}
          renderItem={renderUserItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Icon name="people-outline" size={54} color={theme.colors.textSecondary} />
              <Text style={s.emptyTitle}>No Users Found</Text>
              <Text style={s.emptySubtitle}>
                {searchQuery
                  ? 'No users match your search query.'
                  : 'There are no users in this filter category.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      ...theme.shadows?.sm,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      ...theme.shadows?.sm,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 0,
    },
    chipsWrapper: {
      paddingBottom: 8,
    },
    filterChipsContainer: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    userCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      ...theme.shadows?.sm,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '800',
    },
    statusDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    userInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 3,
    },
    realName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      maxWidth: '75%',
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: theme.colors.border,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    userSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    usernameText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    versionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    versionText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    versionTextOutdated: {
      color: theme.colors.error,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    inlineLoader: {
      marginLeft: 8,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },
    controlsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    checkboxContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    checkboxLabelContainer: {
      flex: 1,
    },
    controlLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    controlValue: {
      fontSize: 12,
      fontWeight: '700',
    },
    centerLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

export default UserStatusScreen;
