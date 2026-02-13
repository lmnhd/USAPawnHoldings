'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconUserPlus,
  IconEdit,
  IconTrash,
  IconKey,
  IconPhone,
  IconMail,
  IconCheck,
  IconX,
  IconShield,
  IconRefresh,
  IconCopy,
} from '@tabler/icons-react';

type StaffMember = {
  name: string;
  pin: string;
  role?: string;
  phone?: string;
  email?: string;
  hired_date?: string;
};

export default function StaffOnboarding() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for new staff
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({
    name: '',
    role: 'Staff',
    phone: '',
    email: '',
    pin: '',
  });

  // Fetch staff
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      showAlert('error', 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Show alert
  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Add staff
  const handleAddStaff = async () => {
    if (!newStaff.name?.trim()) {
      showAlert('error', 'Staff name is required');
      return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });

      if (res.ok) {
        const data = await res.json();
        showAlert('success', `${data.staff.name} added successfully! PIN: ${data.staff.pin}`);
        fetchStaff();
        setShowAddDialog(false);
        setNewStaff({ name: '', role: 'Staff', phone: '', email: '', pin: '' });
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'Failed to add staff member');
      }
    } catch (err) {
      console.error('Failed to add staff:', err);
      showAlert('error', 'Failed to add staff member');
    }
  };

  // Update staff
  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_name: editingStaff.name,
          updates: editingStaff,
        }),
      });

      if (res.ok) {
        showAlert('success', 'Staff member updated successfully');
        fetchStaff();
        setEditingStaff(null);
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'Failed to update staff member');
      }
    } catch (err) {
      console.error('Failed to update staff:', err);
      showAlert('error', 'Failed to update staff member');
    }
  };

  // Delete staff
  const handleDeleteStaff = async (name: string) => {
    try {
      const res = await fetch(`/api/staff?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showAlert('success', 'Staff member removed successfully');
        fetchStaff();
        setDeleteConfirm(null);
      } else {
        const error = await res.json();
        showAlert('error', error.error || 'Failed to remove staff member');
      }
    } catch (err) {
      console.error('Failed to delete staff:', err);
      showAlert('error', 'Failed to remove staff member');
    }
  };

  // Copy PIN to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', 'PIN copied to clipboard');
  };

  return (
    <>
      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4"
          >
            <Alert className={cn(
              'border',
              alert.type === 'success' 
                ? 'bg-vault-success/10 border-vault-success/30 text-vault-success'
                : 'bg-vault-danger/10 border-vault-danger/30 text-vault-danger'
            )}>
              <AlertDescription className="font-body">{alert.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Card */}
      <Card className="rounded-2xl shadow-vault border-vault-border bg-vault-surface-elevated mb-6">
        <CardHeader className="px-5 pt-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="font-display text-lg font-bold text-vault-text-light flex items-center gap-2">
              <IconShield className="h-5 w-5 text-vault-gold" />
              Staff Onboarding
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono bg-vault-surface text-vault-text-muted">
                {staff.length} staff {staff.length === 1 ? 'member' : 'members'}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchStaff}
                className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
              >
                <IconRefresh className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="bg-vault-gold hover:bg-vault-gold-light text-vault-text-on-gold font-semibold"
              >
                <IconUserPlus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="rounded-xl shadow-vault border-vault-border bg-vault-surface h-[200px] animate-pulse" />
              </motion.div>
            ))
          ) : staff.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-vault-text-muted">
              <IconShield className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-body">No staff members yet</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 bg-vault-gold hover:bg-vault-gold-light text-vault-text-on-gold"
              >
                <IconUserPlus className="h-4 w-4 mr-2" />
                Add Your First Staff Member
              </Button>
            </div>
          ) : (
            staff.map((member) => (
              <motion.div
                key={member.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="rounded-xl shadow-vault border-vault-border bg-vault-surface hover:border-vault-gold/40 transition-all">
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-vault-text-light text-lg">
                          {member.name}
                        </h3>
                        <Badge className="mt-1 bg-vault-gold/15 text-vault-gold border-vault-gold/30">
                          {member.role || 'Staff'}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="bg-vault-border" />

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-vault-text-muted">
                        <IconKey className="h-4 w-4 text-vault-gold" />
                        <span className="font-mono font-bold text-vault-text-light">{member.pin}</span>
                        <button
                          onClick={() => copyToClipboard(member.pin)}
                          className="ml-auto p-1 hover:bg-vault-hover-overlay rounded transition-colors"
                        >
                          <IconCopy className="h-3 w-3" />
                        </button>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-vault-text-muted">
                          <IconPhone className="h-4 w-4" />
                          <span className="font-body">{member.phone}</span>
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center gap-2 text-vault-text-muted">
                          <IconMail className="h-4 w-4" />
                          <span className="font-body truncate">{member.email}</span>
                        </div>
                      )}
                      {member.hired_date && (
                        <p className="text-xs text-vault-text-muted/70 font-mono mt-2">
                          Hired: {new Date(member.hired_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingStaff(member)}
                        className="flex-1 border-vault-border text-vault-gold hover:bg-vault-gold/10"
                      >
                        <IconEdit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(member.name)}
                        className="border-vault-danger/50 text-vault-danger hover:bg-vault-danger/10"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-vault-surface-elevated border-vault-border text-vault-text-light max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-vault-gold">
              Add New Staff Member
            </DialogTitle>
            <DialogDescription className="text-vault-text-muted">
              Create a new staff account with clock-in credentials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                Full Name <span className="text-vault-danger">*</span>
              </label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="John Doe"
                className="bg-vault-surface border-vault-border text-vault-text-light"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                Role
              </label>
              <Select
                value={newStaff.role}
                onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}
              >
                <SelectTrigger className="bg-vault-surface border-vault-border text-vault-text-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Appraiser">Appraiser</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                  Phone (optional)
                </label>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="bg-vault-surface border-vault-border text-vault-text-light"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                  PIN (optional)
                </label>
                <Input
                  value={newStaff.pin}
                  onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value })}
                  placeholder="Auto-generate"
                  maxLength={4}
                  className="bg-vault-surface border-vault-border text-vault-text-light font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                Email (optional)
              </label>
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="john@usapawnfl.com"
                className="bg-vault-surface border-vault-border text-vault-text-light"
              />
            </div>

            <Alert className="bg-vault-info/10 border-vault-info/30 text-vault-info">
              <AlertDescription className="text-xs font-body">
                💡 If no PIN is provided, a random 4-digit PIN will be generated automatically.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStaff}
              className="bg-vault-gold hover:bg-vault-gold-light text-vault-text-on-gold font-semibold"
            >
              <IconCheck className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="bg-vault-surface-elevated border-vault-border text-vault-text-light max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-vault-gold">
              Edit Staff Member
            </DialogTitle>
            <DialogDescription className="text-vault-text-muted">
              Update staff information and credentials
            </DialogDescription>
          </DialogHeader>

          {editingStaff && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                  Full Name
                </label>
                <Input
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="bg-vault-surface border-vault-border text-vault-text-light"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                  Role
                </label>
                <Select
                  value={editingStaff.role || 'Staff'}
                  onValueChange={(value) => setEditingStaff({ ...editingStaff, role: value })}
                >
                  <SelectTrigger className="bg-vault-surface border-vault-border text-vault-text-light">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Appraiser">Appraiser</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Phone
                  </label>
                  <Input
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="bg-vault-surface border-vault-border text-vault-text-light"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    PIN
                  </label>
                  <Input
                    value={editingStaff.pin}
                    onChange={(e) => setEditingStaff({ ...editingStaff, pin: e.target.value })}
                    maxLength={4}
                    className="bg-vault-surface border-vault-border text-vault-text-light font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={editingStaff.email || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="bg-vault-surface border-vault-border text-vault-text-light"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingStaff(null)}
              className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStaff}
              className="bg-vault-gold hover:bg-vault-gold-light text-vault-text-on-gold font-semibold"
            >
              <IconCheck className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-vault-surface-elevated border-vault-border text-vault-text-light">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-vault-danger">
              Remove Staff Member
            </DialogTitle>
            <DialogDescription className="text-vault-text-muted">
              This will permanently remove <strong className="text-vault-text-light">{deleteConfirm}</strong> from the system. 
              They will no longer be able to clock in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDeleteStaff(deleteConfirm)}
              className="bg-vault-danger hover:bg-vault-danger/90 text-white font-semibold"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Remove Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
