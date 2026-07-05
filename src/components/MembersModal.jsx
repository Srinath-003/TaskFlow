import { useState } from "react";

function MembersModal({ collab, currentUserId, onInvite, onRemove, onClose }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = collab && collab.ownerId === currentUserId;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    setInviteSuccess("");
    setLoading(true);
    try {
      await onInvite(collab._id, inviteEmail.trim());
      setInviteSuccess(`Invited ${inviteEmail.trim()} successfully!`);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to invite user.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await onRemove(collab._id, memberId);
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to remove member.");
    }
  };

  if (!collab) return null;

  const owner = collab.members.find(m => m.role === "owner");
  const otherMembers = collab.members.filter(m => m.role !== "owner");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h2 className="modal-title">Team Members</h2>
              <p className="modal-subtitle">{collab.topicName}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Owner */}
          <div className="members-section">
            <p className="members-label">Owner</p>
            <div className="member-row">
              <div className="member-avatar owner-avatar">
                {owner?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="member-info">
                <span className="member-name">{owner?.name}</span>
                <span className="member-email">{owner?.email}</span>
              </div>
              <span className="role-badge owner-badge">Owner</span>
            </div>
          </div>

          {/* Members */}
          {otherMembers.length > 0 && (
            <div className="members-section">
              <p className="members-label">Members ({otherMembers.length})</p>
              {otherMembers.map(member => (
                <div key={member.userId} className="member-row">
                  <div className="member-avatar member-av">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>
                    <span className="member-email">{member.email}</span>
                  </div>
                  <span className="role-badge member-badge">Member</span>
                  {isOwner && (
                    <button
                      className="remove-member-btn"
                      onClick={() => handleRemove(member.userId)}
                      aria-label={`Remove ${member.name}`}
                      title="Remove member"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Invite section (owner only) */}
          {isOwner && (
            <div className="invite-section">
              <p className="members-label">Invite by Email</p>
              <div className="invite-form">
                <input
                  type="email"
                  className="invite-input"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                />
                <button
                  className="invite-btn"
                  onClick={handleInvite}
                  disabled={loading || !inviteEmail.trim()}
                >
                  {loading ? "Inviting…" : "Invite"}
                </button>
              </div>
              {inviteError && <p className="invite-feedback error">{inviteError}</p>}
              {inviteSuccess && <p className="invite-feedback success">{inviteSuccess}</p>}
            </div>
          )}

          {!isOwner && (
            <div className="invite-section">
              <p className="members-label info-text">Only the owner can invite new members.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MembersModal;
