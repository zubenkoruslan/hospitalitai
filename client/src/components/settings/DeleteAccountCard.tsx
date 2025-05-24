import React, { useState } from "react";

interface DeleteAccountCardProps {
  onDeleteAccount: () => void;
  userType: "restaurant" | "staff"; // To customize messages if needed
}

const DeleteAccountCard: React.FC<DeleteAccountCardProps> = ({
  onDeleteAccount,
  userType,
}) => {
  const [confirmationText, setConfirmationText] = useState("");
  const requiredConfirmationText = "DELETE MY ACCOUNT";

  const handleDelete = () => {
    if (confirmationText === requiredConfirmationText) {
      onDeleteAccount();
    } else {
      // Maybe show an error message to the user
      alert(`Please type "${requiredConfirmationText}" to confirm.`);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 border border-red-200">
      <h3 className="text-xl font-semibold mb-4 text-red-700">
        Delete Account
      </h3>
      <p className="mb-4 text-sm text-gray-600">
        This action is irreversible. All your data associated with this account
        will be permanently deleted.
        {userType === "restaurant" &&
          " This includes all staff accounts, quiz data, and menu items linked to your restaurant."}
      </p>
      <p className="mb-2 font-medium text-gray-700">
        To confirm, please type "
        <strong className="text-red-600">{requiredConfirmationText}</strong>" in
        the box below:
      </p>
      <input
        type="text"
        value={confirmationText}
        onChange={(e) => setConfirmationText(e.target.value)}
        placeholder={requiredConfirmationText}
        className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-red-500 focus:border-red-500"
      />
      <button
        onClick={handleDelete}
        disabled={confirmationText !== requiredConfirmationText}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-red-300 disabled:cursor-not-allowed"
      >
        Delete My Account
      </button>
    </div>
  );
};

export default DeleteAccountCard;
