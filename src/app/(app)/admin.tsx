import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AddPublicCampsiteForm } from "@/components/admin/AddPublicCampsiteForm";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { CT_CONFIG } from "@/lib/config";
import { fmtDate, timeAgo } from "@/lib/dates";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

const STATUS_COLORS: Record<string, string> = { success: "#5BD46B", failed: "#E0673C", in_progress: "#D9A441", never: "#6E8CA8" };
const STATUS_LABELS: Record<string, string> = { success: "Healthy", failed: "Failed", in_progress: "Syncing…", never: "Never synced" };

// Mirrors CampTrack/admin.html + js/admin.js. Real enforcement lives
// server-side; requireAdmin() there (and the Stack.Protected guard on the
// header icon here) is purely a UX nicety.
export default function AdminScreen() {
  const toast = useToast();
  const { session, refresh } = useAuth();
  const [users, setUsers] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [addPublicOpen, setAddPublicOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [integrations, setIntegrations] = useState<api.IntegrationStatus[] | null>(null);
  const [integrationsError, setIntegrationsError] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [versionInput, setVersionInput] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);

  const load = useCallback((q?: string) => {
    api
      .adminGetUsers(q)
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  const loadIntegrations = useCallback(() => {
    api
      .adminGetIntegrations()
      .then((list) => {
        setIntegrations(list);
        if (list.some((i) => i.status === "in_progress")) setTimeout(loadIntegrations, 3000);
      })
      .catch((e) => setIntegrationsError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => load(), [load]);
  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);
  useEffect(() => {
    api
      .getAppInfo()
      .then((info) => {
        setAppVersion(info.version);
        setVersionInput(info.version);
      })
      .catch(() => {});
  }, []);
  // Refreshes the viewer's own cached delete-permission flag on every visit
  // — otherwise a permission just granted by another admin wouldn't show
  // the Danger Zone until next full login. Mirrors admin.js's own
  // CT.getMe().then(...) call.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // requireAdmin() equivalent — real enforcement lives server-side; this is
  // purely a UX nicety so a non-admin who somehow lands here is redirected
  // cleanly instead of seeing a page full of failed requests.
  if (session && !session.isAdmin) return <Redirect href="/(app)/(tabs)" />;

  async function saveVersion() {
    if (!versionInput.trim()) return toast("Enter a version number");
    setSavingVersion(true);
    try {
      await api.adminSetAppVersion(versionInput.trim());
      setAppVersion(versionInput.trim());
      toast("Version updated");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSavingVersion(false);
    }
  }

  async function syncIntegration(key: string) {
    try {
      await api.adminSyncIntegration(key);
      toast("Sync started");
    } catch (e: any) {
      toast(e.message);
    }
    loadIntegrations();
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const token = await api.getToken();
      const url = `${CT_CONFIG.API_BASE}/admin/users/export`;
      const dest = new File(Paths.cache, `camptrack-users-${new Date().toISOString().slice(0, 10)}.csv`);
      const download = await File.downloadFileAsync(url, dest, { headers: { Authorization: `Bearer ${token}` } });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(download.uri);
    } catch (e: any) {
      toast(e.message || "Couldn't export users.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-end mb-3 mt-1">
        <Button title="Export CSV" variant="ghost" size="sm" onPress={exportCsv} loading={exporting} />
      </View>

      <Card>
        <Text className="font-display text-lg text-ink mb-2">Users</Text>
        <TextField
          placeholder="Search users…"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            load(v.trim());
          }}
        />
        {error ? (
          <Text className="text-danger">{error}</Text>
        ) : users === null ? (
          <ActivityIndicator color="#5BD46B" className="mt-2" />
        ) : users.length === 0 ? (
          <EmptyState>No users match that search.</EmptyState>
        ) : (
          users.map((u) => (
            <Pressable key={u.id} onPress={() => setDetailUserId(u.id)} className="py-3 border-b border-line">
              <Text className="text-ink font-body-bold">
                {u.firstName || u.username} {u.lastName || ""}
              </Text>
              <Text className="text-stone text-xs">@{u.username}</Text>
              {u.isAdmin ? (
                <View className="mt-1">
                  <Badge kind="active" icon="admin">Admin</Badge>
                </View>
              ) : null}
              <Text className="text-stone text-xs mt-1">{u.email || "no email"} · {u.signInMethod}</Text>
              <Text className="text-stone text-xs">
                Joined {fmtDate(u.createdAt.slice(0, 10))} · Last login {u.lastLoginAt ? fmtDate(u.lastLoginAt.slice(0, 10)) : "—"}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Add a public campsite</Text>
        <Text className="text-stone text-sm mb-3">Saved under your account and visible on Explore immediately.</Text>
        <Button title="+ Add public campsite" onPress={() => setAddPublicOpen(true)} />
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-2">App version</Text>
        <View className="flex-row gap-2 items-end">
          <View className="flex-1">
            <TextField label={`Current: ${appVersion || "—"}`} value={versionInput} onChangeText={setVersionInput} autoCapitalize="none" />
          </View>
          <Button title="Save" size="sm" onPress={saveVersion} loading={savingVersion} />
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-display text-lg text-ink">Integrations</Text>
          <Button title="Refresh" icon="refresh" variant="ghost" size="sm" onPress={loadIntegrations} />
        </View>
        {integrationsError ? (
          <Text className="text-danger text-sm">{integrationsError}</Text>
        ) : integrations === null ? (
          <ActivityIndicator color="#5BD46B" />
        ) : (
          integrations.map((i) => (
            <View key={i.key} className="py-2.5 border-b border-line">
              <View className="flex-row items-center gap-2">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLORS[i.status] }} />
                <View className="flex-1">
                  <Text className="text-ink font-body-bold text-sm">{i.name}</Text>
                  <Text className="text-stone text-xs">{i.category}</Text>
                </View>
                {i.manualSync ? (
                  <Button
                    title={i.status === "in_progress" ? "Syncing…" : "Sync Now"}
                    icon="sync"
                    variant="ghost"
                    size="sm"
                    disabled={i.status === "in_progress"}
                    onPress={() => syncIntegration(i.key)}
                  />
                ) : null}
              </View>
              <Text className="text-stone text-xs mt-1">
                {STATUS_LABELS[i.status] || i.status} · Last sync: {timeAgo(i.lastAttemptAt)}
              </Text>
              {i.status === "failed" && i.lastError ? <Text className="text-danger text-xs mt-0.5">{i.lastError}</Text> : null}
            </View>
          ))
        )}
      </Card>

      <UserDetailModal
        visible={!!detailUserId}
        userId={detailUserId}
        currentUsername={session?.username || null}
        currentCanDeleteUsers={!!session?.canDeleteUsers}
        onClose={() => setDetailUserId(null)}
        onChanged={() => load(search.trim())}
      />
      <AddPublicCampsiteForm visible={addPublicOpen} onClose={() => setAddPublicOpen(false)} onSaved={() => setAddPublicOpen(false)} />
    </Screen>
  );
}
