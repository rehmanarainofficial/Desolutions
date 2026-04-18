import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectIsAuthenticated, restoreSession } from '@store/slices/authSlice';

import LoginScreen from '@screens/auth/LoginScreen';
import MainScreen from '@screens/MainScreen';
import DashboardScreen from '@screens/dashboard/DashboardScreen';
import ApprovalsScreen from '@screens/approvals/ApprovalsScreen';
import SalesScreen from '@screens/sales/SalesScreen';
import PurchaseScreen from '@screens/purchase/PurchaseScreen';
import InventoryScreen from '@screens/inventory/InventoryScreen';
import HCMScreen from '@screens/hcm/HCMScreen';
import ManufacturingScreen from '@screens/manufacturing/ManufacturingScreen';
import CRMScreen from '@screens/crm/CRMScreen';
import FinanceScreen from '@screens/finance/FinanceScreen';
import AccountDetailScreen from '@screens/dashboard/AccountDetailScreen';
import LedgerScreen from '@components/ledger/LedgerScreen';
import CustomerAgingScreen from '@components/aging/CustomerAgingScreen';
import CustomerBalanceDetailsScreen from '@components/aging/CustomerBalanceDetailsScreen';
import FinancialDetailScreen from '@screens/dashboard/FinancialDetailScreen';
import InventoryValuationScreen from '@screens/dashboard/InventoryValuationScreen';
import ReportingScreen from '@screens/reporting/ReportingScreen';
import ReportPersonSelectScreen from '@screens/reporting/ReportPersonSelectScreen';
import VoidTransactionsScreen from '@screens/voidTransactions/VoidTransactionsScreen';
import VoidTransactionDetailScreen from '@screens/voidTransactions/VoidTransactionDetailScreen';
import TrailBalanceReportScreen from '@screens/reporting/TrailBalanceReportScreen';
import BalanceSheetReportScreen from '@screens/reporting/BalanceSheetReportScreen';
import AttendanceScreen from '@screens/hcm/AttendanceScreen';
import ExpenseClaimInquiryScreen from '@screens/hcm/ExpenseClaimInquiryScreen';
import ExpenseClaimScreen from '@screens/hcm/ExpenseClaimScreen';
import { LoadingSpinner, CustomHeader } from '@components/common';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isLoading, setIsLoading] = React.useState(true);

  // Restore session on app start
  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        const company = await AsyncStorage.getItem('company');

        if (userJson) {
          const user = JSON.parse(userJson);
          dispatch(restoreSession({ user, company }));
        }
      } catch (error) {
        console.log('Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreUserSession();
  }, [dispatch]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: props => <CustomHeader {...props} />,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainScreen"
              component={MainScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen
              name="AccountDetail"
              component={AccountDetailScreen}
            />
            <Stack.Screen name="Ledger" component={LedgerScreen} />
            <Stack.Screen
              name="CustomerAging"
              component={CustomerAgingScreen}
            />
            <Stack.Screen
              name="CustomerBalanceDetails"
              component={CustomerBalanceDetailsScreen}
            />
            <Stack.Screen
              name="FinancialDetail"
              component={FinancialDetailScreen}
            />
            <Stack.Screen
              name="InventoryValuation"
              component={InventoryValuationScreen}
            />
            <Stack.Screen name="Approvals" component={ApprovalsScreen} />
            <Stack.Screen name="Reporting" component={ReportingScreen} />
            <Stack.Screen
              name="ReportPersonSelect"
              component={ReportPersonSelectScreen}
            />
            <Stack.Screen
              name="VoidTransactions"
              component={VoidTransactionsScreen}
            />
            <Stack.Screen
              name="VoidTransactionDetail"
              component={VoidTransactionDetailScreen}
            />
            <Stack.Screen
              name="TrailBalanceReport"
              component={TrailBalanceReportScreen}
            />
            <Stack.Screen
              name="BalanceSheetReport"
              component={BalanceSheetReportScreen}
              options={{ title: 'Balance Sheet' }}
            />
            <Stack.Screen name="Sales" component={SalesScreen} />
            <Stack.Screen name="Purchase" component={PurchaseScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
            <Stack.Screen name="HCM" component={HCMScreen} />
            <Stack.Screen
              name="Manufacturing"
              component={ManufacturingScreen}
            />
            <Stack.Screen name="CRM" component={CRMScreen} />
            <Stack.Screen name="Finance" component={FinanceScreen} />
            {/* Placeholder screens for module quick actions */}
            <Stack.Screen name="SalesAddCustomer" component={FinanceScreen} />
            <Stack.Screen name="SalesDelivery" component={FinanceScreen} />
            <Stack.Screen
              name="SalesTrackOrderStatus"
              component={FinanceScreen}
            />
            <Stack.Screen name="SalesReceivable" component={FinanceScreen} />
            <Stack.Screen name="SalesCostCenter" component={FinanceScreen} />
            <Stack.Screen name="SalesTransactions" component={FinanceScreen} />

            <Stack.Screen
              name="PurchaseAddSupplier"
              component={FinanceScreen}
            />
            <Stack.Screen name="PurchaseGRNAgainPO" component={FinanceScreen} />
            <Stack.Screen name="PurchasePDCDetail" component={FinanceScreen} />
            <Stack.Screen
              name="PurchasePayableSummary"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="PurchaseTransactions"
              component={FinanceScreen}
            />

            <Stack.Screen name="InventoryAddItem" component={FinanceScreen} />
            <Stack.Screen
              name="InventorySearchItem"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="InventoryItemMovement"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="InventoryLocationTransfer"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="InventoryAdjustment"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="InventoryDatedStockSheet"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="InventoryTransactions"
              component={FinanceScreen}
            />

            <Stack.Screen name="HCMAttendance" component={AttendanceScreen} />
            <Stack.Screen name="HCMExpenseClaim" component={ExpenseClaimInquiryScreen} />
            <Stack.Screen name="ExpenseClaim" component={ExpenseClaimScreen} />
            <Stack.Screen name="HCMDVRInquiry" component={FinanceScreen} />
            <Stack.Screen name="HCMLocalPurchase" component={FinanceScreen} />

            <Stack.Screen
              name="MfgElectricalJobCards"
              component={FinanceScreen}
            />
            <Stack.Screen
              name="MfgMechanicalJobCards"
              component={FinanceScreen}
            />
            <Stack.Screen name="MfgTransactions" component={FinanceScreen} />

            <Stack.Screen name="CRMAddLead" component={FinanceScreen} />
            <Stack.Screen name="CRMViewLead" component={FinanceScreen} />
            <Stack.Screen name="CRMScheduleMeeting" component={FinanceScreen} />
            <Stack.Screen name="CRMLeadToOrder" component={FinanceScreen} />

            <Stack.Screen name="FinanceViewLedger" component={FinanceScreen} />
            <Stack.Screen
              name="FinanceTransactions"
              component={FinanceScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
