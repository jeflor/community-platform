"use client";

import { useState } from "react";
import { InviteMemberModal } from "./InviteMemberModal";

interface Group {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
}

interface InviteMemberButtonProps {
  groups: Group[];
}

export function InviteMemberButton({ groups }: InviteMemberButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
      >
        Invite Member
      </button>

      {showModal && (
        <InviteMemberModal
          groups={groups}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
