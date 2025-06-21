import React, { useState, useEffect } from "react";
import {
  getRestaurantInvitations,
  cancelInvitation,
  PendingInvitation,
} from "../../services/api";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import {
  ClockIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface PendingInvitationsTableProps {
  onInvitationCancelled?: () => void;
  className?: string;
}

const PendingInvitationsTable: React.FC<PendingInvitationsTableProps> = ({
  onInvitationCancelled,
  className = "",
}) => {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const fetchedInvitations = await getRestaurantInvitations();
      setInvitations(fetchedInvitations);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingIds((prev) => new Set(prev).add(invitationId));

    try {
      await cancelInvitation(invitationId);

      // Remove from local state
      setInvitations((prev) => prev.filter((inv) => inv._id !== invitationId));

      // Call callback
      if (onInvitationCancelled) {
        onInvitationCancelled();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel invitation");
    } finally {
      setCancellingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    return `${diffDays} days remaining`;
  };

  if (loading) {
    return (
      <div
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}
      >
        <LoadingSpinner message="Loading pending invitations..." />
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Pending Invitations
              </h3>
              <p className="text-sm text-slate-600">
                {invitations.length === 0
                  ? "No pending invitations"
                  : `${invitations.length} invitation${
                      invitations.length !== 1 ? "s" : ""
                    } awaiting acceptance`}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={fetchInvitations}
            className="ml-4"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6 border-b border-slate-200">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <EnvelopeIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 mb-2">
              No pending invitations
            </h4>
            <p className="text-slate-600">
              All staff invitations have been accepted or expired.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation._id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">
                        {invitation.name || invitation.email}
                      </h4>
                      {invitation.name && (
                        <p className="text-sm text-slate-600 mt-1">
                          {invitation.email}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>Sent {formatDate(invitation.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{getTimeRemaining(invitation.expiresAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Status Badge */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        Pending
                      </span>

                      {/* Cancel Button */}
                      <Button
                        variant="secondary"
                        onClick={() => handleCancelInvitation(invitation._id)}
                        isLoading={cancellingIds.has(invitation._id)}
                        disabled={cancellingIds.has(invitation._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {cancellingIds.has(invitation._id) ? (
                          "Cancelling..."
                        ) : (
                          <>
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {invitations.length > 0 && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center text-sm text-slate-600">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>
              Invitations automatically expire after 7 days. Staff members will
              need to accept the invitation to create their account.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingInvitationsTable;
