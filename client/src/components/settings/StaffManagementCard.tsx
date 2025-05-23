import React from "react";

interface StaffManagementCardProps {
  // TODO: Define props: staffList, onInviteStaff, onRemoveStaff
}

const StaffManagementCard: React.FC<StaffManagementCardProps> = (
  {
    /* TODO: Destructure props */
  }
) => {
  // TODO: Manage state for invite form (e.g., email)
  // TODO: Handle invite form submission
  // TODO: Handle remove staff action

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-slate-700 mb-2">
          Invite New Staff
        </h4>
        <form className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Staff email address"
            // TODO: value and onChange
            className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Send Invite
          </button>
        </form>
      </div>

      <div>
        <h4 className="text-lg font-medium text-slate-700 mb-2">
          Current Staff
        </h4>
        {/* TODO: Render list of staff members with a remove button for each */}
        {/* Example structure for a staff member item:
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
          <p className="text-slate-700">staff.name - staff.email</p>
          <button className="text-red-500 hover:text-red-700">Remove</button>
        </div>
        */}
        <p className="text-slate-500">Staff list will be displayed here.</p>
      </div>
    </div>
  );
};

export default StaffManagementCard;
