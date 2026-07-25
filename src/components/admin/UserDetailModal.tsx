import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { SwitchRow } from "@/components/ui/SwitchRow";
import * as api from "@/lib/api";
import { fmtDate } from "@/lib/dates";
import { useToast } from "@/lib/toast";

type AdminUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  signInMethod: string;
  createdAt: string;
  lastLoginAt?: string;
  isAdmin: boolean;
  isProtectedAdmin: boolean;
  canDeleteUsers: boolean;
  counts: { campsites: number; trips: number; maintenance: number };
};

// Mirrors openUserDetail() in CampTrack/js/admin.js.
export function UserDetailModal({
  visible,
  userId,
  currentUsername,
  currentCanDeleteUsers,
  onClose,
  onChanged,
}: {
  visible: boolean;
  userId: string | null;
  currentUsername: string | null;
  currentCanDeleteUsers: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [resetResult, setResetResult] = useState<{ kind: "sent"; to: string } | { kind: "temp"; username: string; password: string } | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      setResetResult(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      api
        .adminGetUser(userId)
        .then(setUser)
        .catch((e) => toast(e.message));
    } else {
      setUser(null);
    }
  }, [visible, userId]);

  if (!visible || !user) {
    return <FormModal visible={visible} title="Loading…" onClose={onClose}><View /></FormModal>;
  }

  const isSelf = user.username === currentUsername;

  async function toggleAdmin(next: boolean) {
    try {
      await api.adminSetIsAdmin(user!.id, next);
      setUser((u) => (u ? { ...u, isAdmin: next } : u));
      toast(next ? "Admin access granted" : "Admin access revoked");
      onChanged();
    } catch (e: any) {
      toast(e.message);
    }
  }

  async function sendResetLink() {
    setSendingReset(true);
    try {
      const result = await api.adminSendResetLink(user!.id);
      setResetResult({ kind: "sent", to: result.sentTo });
    } catch (e: any) {
      toast(e.message);
      setSendingReset(false);
    }
  }

  async function toggleDeletePermission(next: boolean) {
    try {
      await api.adminSetCanDeleteUsers(user!.id, next);
      setUser((u) => (u ? { ...u, canDeleteUsers: next } : u));
      toast(next ? "Delete permission granted" : "Delete permission revoked");
      onChanged();
    } catch (e: any) {
      toast(e.message);
    }
  }

  async function confirmDelete() {
    if (deleteConfirmText !== user!.username) return;
    setDeleting(true);
    try {
      await api.adminDeleteUser(user!.id);
      toast(`${user!.username} was permanently deleted.`);
      onChanged();
      onClose();
    } catch (e: any) {
      toast(e.message);
      setDeleting(false);
    }
  }

  function forceReset() {
    Alert.alert(
      "Force password reset",
      `This immediately replaces ${user!.username}'s password. Their old password (if any) will stop working right away. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await api.adminForceReset(user!.id);
              setResetResult({ kind: "temp", username: result.username, password: result.tempPassword });
            } catch (e: any) {
              toast(e.message);
            }
          },
        },
      ]
    );
  }

  return (
    <FormModal visible={visible} title={`${user.firstName || user.username} ${user.lastName || ""}`.trim()} onClose={onClose}>
      <Text className="text-stone text-xs">
        @{user.username} · {user.signInMethod} sign-in · joined {fmtDate(user.createdAt.slice(0, 10))}
      </Text>
      <Text className="text-ink text-sm mt-1">{user.email || <Text className="text-stone">No email on file</Text>}</Text>
      <Text className="text-stone text-xs mt-0.5">Last login: {user.lastLoginAt ? fmtDate(user.lastLoginAt.slice(0, 10)) : "never"}</Text>

      <View className="flex-row gap-2.5 mt-3.5">
        {[
          ["Campsites", user.counts.campsites],
          ["Trips", user.counts.trips],
          ["Maintenance", user.counts.maintenance],
        ].map(([label, value]) => (
          <View key={label as string} className="flex-1 bg-white/5 rounded-sm p-3 items-center">
            <Text className="font-display text-xl text-lime">{value}</Text>
            <Text className="text-stone text-xs">{label}</Text>
          </View>
        ))}
      </View>

      <Text className="font-display text-base text-ink mt-4 mb-1">Admin access</Text>
      {user.isProtectedAdmin ? (
        <Text className="text-stone text-sm">This account's admin access is set on the server and can only be changed there.</Text>
      ) : isSelf ? (
        <Text className="text-stone text-sm">You can't revoke your own admin access from here — ask another admin.</Text>
      ) : (
        <SwitchRow label="Admin access" value={user.isAdmin} onChange={toggleAdmin} />
      )}

      <Text className="font-display text-base text-ink mt-4 mb-1">Password help</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button
          title="Send reset link"
          icon="email"
          variant="ghost"
          size="sm"
          disabled={!(user.email && user.signInMethod === "Password") || sendingReset}
          onPress={sendResetLink}
        />
        <Button title="Force password reset" icon="key" variant="danger" size="sm" onPress={forceReset} />
      </View>
      {!user.email ? <Text className="text-stone text-xs mt-1">No email on file — "Send reset link" needs one.</Text> : null}
      {user.signInMethod !== "Password" ? (
        <Text className="text-stone text-xs mt-1">
          Signs in with {user.signInMethod} — "Send reset link" only applies to password accounts.
        </Text>
      ) : null}

      {resetResult ? (
        <View className="bg-lime-dim rounded-sm p-3 mt-3">
          {resetResult.kind === "sent" ? (
            <Text className="text-lime-bright text-sm">Reset link sent to {resetResult.to}.</Text>
          ) : (
            <>
              <Text className="text-lime-bright text-sm">
                New temporary password for {resetResult.username} — shown once, share it securely:
              </Text>
              <Text className="font-mono text-ink bg-black/25 rounded p-2 mt-1.5">{resetResult.password}</Text>
            </>
          )}
        </View>
      ) : null}

      <Text className="font-display text-base text-ink mt-4 mb-1">Delete permission</Text>
      <Text className="text-stone text-sm mb-1">
        A separate privilege from admin access — an admin without this can manage users but can't delete accounts.
      </Text>
      <SwitchRow label="Can delete user accounts" value={user.canDeleteUsers} onChange={toggleDeletePermission} />

      {currentCanDeleteUsers && (
        <View className="mt-5 p-3.5 border border-danger rounded-sm">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Icon name="warning" size={16} color="#E0673C" />
            <Text className="font-display text-base text-danger">Danger zone</Text>
          </View>
          {isSelf ? (
            <Text className="text-stone text-sm">You can't delete your own account from inside the panel.</Text>
          ) : user.isProtectedAdmin ? (
            <Text className="text-stone text-sm">This account's admin access is set on the server — remove it there first if it needs to be deleted.</Text>
          ) : !showDeleteConfirm ? (
            <>
              <Text className="text-ink text-sm mb-2">
                Permanently deletes @{user.username} and every campsite, trip, and maintenance record they own. This cannot be undone.
              </Text>
              <Button title="Delete User Account" icon="trash" variant="danger" size="sm" onPress={() => setShowDeleteConfirm(true)} />
            </>
          ) : (
            <>
              <Text className="text-ink text-sm mb-1">
                Type <Text className="font-mono font-body-bold">{user.username}</Text> to confirm
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={user.username}
                placeholderTextColor="#6d766e"
                autoCapitalize="none"
                className="font-mono text-ink border border-line rounded-sm px-3 py-2 bg-white/[0.04] mb-2"
              />
              <View className="flex-row gap-2">
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                />
                <Button
                  title="Permanently delete this account"
                  variant="danger"
                  size="sm"
                  disabled={deleteConfirmText !== user.username}
                  loading={deleting}
                  onPress={confirmDelete}
                />
              </View>
            </>
          )}
        </View>
      )}
    </FormModal>
  );
}
