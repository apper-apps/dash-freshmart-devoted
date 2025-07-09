import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import AttendanceTracking from "@/components/pages/AttendanceTracking";
import EmployeeManagement from "@/components/pages/EmployeeManagement";
import PayrollCalculation from "@/components/pages/PayrollCalculation";

function PayrollManagement() {
  const [activeTab, setActiveTab] = useState('employees');
  const tabs = [
    { id: 'employees', label: 'Employee Management', icon: 'Users' },
    { id: 'attendance', label: 'Attendance Tracking', icon: 'Clock' },
    { id: 'payroll', label: 'Payroll Calculation', icon: 'Calculator' }
  ];
// Memoized tab content renderer to prevent unnecessary re-renders
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeManagement />;
      case 'attendance':
        return <AttendanceTracking />;
      case 'payroll':
        return <PayrollCalculation />;
      default:
        return <EmployeeManagement />;
    }
  }, [activeTab]);

  // Memoized tab change handler
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payroll Management</h1>
        <p className="text-gray-600">
          Manage employees, track attendance, and calculate payroll
        </p>
      </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-card mb-6">
          <div className="flex overflow-x-auto border-b">
{tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-4 font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ApperIcon name={tab.icon} size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-card">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default PayrollManagement;