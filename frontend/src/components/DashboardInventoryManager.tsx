'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { normalizeTagList } from '@/lib/tag-governance';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconEdit,
  IconTrash,
  IconPhoto,
  IconX,
  IconCheck,
  IconSearch,
  IconFilter,
  IconRefresh,
} from '@tabler/icons-react';

type InventoryStatus = 'available' | 'sold' | 'pending' | 'returned';

export type InventoryItem = {
  item_id: string;
  category: string;
  brand?: string;
  description?: string;
  tags?: string[];
  price?: number;
  condition?: string;
  status: InventoryStatus;
  images?: string[];
  created_at: string;
  updated_at?: string;
};

export default function DashboardInventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch inventory
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery) params.set('keyword', searchQuery);
      params.set('limit', '100');

      const res = await fetch(`/api/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter, categoryFilter]);

  // Delete item
  const handleDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/inventory?item_id=${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems(items.filter((i) => i.item_id !== itemId));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete item');
    }
  };

  // Remove single image from item
  const handleRemoveImage = async (item: InventoryItem, imageIndex: number) => {
    const newImages = (item.images || []).filter((_, i) => i !== imageIndex);
    await handleUpdate(item.item_id, { images: newImages });
  };

  // Update item
  const handleUpdate = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      const res = await fetch(`/api/inventory`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, ...updates }),
      });

      if (res.ok) {
        const updated = await res.json();
        setItems(items.map((i) => (i.item_id === itemId ? updated : i)));
        setEditingItem(null);
        return true;
      } else {
        alert('Failed to update item');
        return false;
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update item');
      return false;
    }
  };

  // Save edits
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const success = await handleUpdate(editingItem.item_id, {
      description: editingItem.description,
      brand: editingItem.brand,
      price: editingItem.price,
      condition: editingItem.condition,
      status: editingItem.status,
      tags: editingItem.tags || [],
      images: editingItem.images || [],
    });
    if (success) {
      setEditingItem(null);
    }
  };

  const filteredItems = items;

  return (
    <>
      {/* Header & Filters */}
      <Card className="rounded-2xl shadow-vault border-vault-border bg-vault-surface-elevated mb-6">
        <CardHeader className="px-5 pt-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="font-display text-lg font-bold text-vault-text-light flex items-center gap-2">
              <IconPhoto className="h-5 w-5 text-vault-gold" />
              Inventory Manager
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono bg-vault-surface text-vault-text-muted">
                {items.length} items
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchInventory()}
                className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
              >
                <IconRefresh className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator className="bg-vault-border" />
        <CardContent className="p-5 space-y-3">
          {/* Search */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vault-text-muted" />
            <Input
              placeholder="Search by brand, description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInventory()}
              className="pl-10 bg-vault-surface border-vault-border text-vault-text-light placeholder:text-vault-text-muted"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-vault-surface border-vault-border text-vault-text-light">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-vault-surface border-vault-border text-vault-text-light">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={fetchInventory}
              className="bg-vault-gold hover:bg-vault-gold-light text-vault-text-on-gold font-semibold"
            >
              <IconFilter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {loading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="rounded-xl shadow-vault border-vault-border bg-vault-surface h-[340px] animate-pulse" />
              </motion.div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-vault-text-muted">
              <IconPhoto className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-body">No inventory items found</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                key={item.item_id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="rounded-xl shadow-vault border-vault-border bg-vault-surface hover:border-vault-gold/40 transition-all group">
                  <CardContent className="p-4 space-y-3">
                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-vault-black">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.description}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-vault-text-muted">
                          <IconPhoto className="h-12 w-12 opacity-30" />
                        </div>
                      )}
                      <Badge
                        className={cn(
                          'absolute top-2 right-2 font-mono text-xs',
                          item.status === 'available' && 'bg-vault-success text-white',
                          item.status === 'sold' && 'bg-vault-danger text-white',
                          item.status === 'pending' && 'bg-vault-warning text-white',
                          item.status === 'returned' && 'bg-vault-info text-white'
                        )}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-vault-text-light line-clamp-1">
                        {item.brand}
                      </h3>
                      <p className="text-xs text-vault-text-muted line-clamp-2 font-body">
                        {item.description}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={`${item.item_id}-${tag}`}
                              variant="outline"
                              className="text-[10px] border-vault-gold/30 text-vault-gold/90"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-[10px] border-vault-border text-vault-text-muted">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-lg font-bold text-vault-gold">
                          ${(item.price || 0).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs border-vault-border text-vault-text-muted">
                          {item.category}
                        </Badge>
                      </div>
                      {item.images && item.images.length > 1 && (
                        <p className="text-[10px] text-vault-text-muted font-mono">
                          {item.images.length} images
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItem({ 
                          ...item, 
                          images: item.images || [],
                          price: item.price || 0,
                          brand: item.brand || '',
                          description: item.description || '',
                          tags: Array.isArray(item.tags) ? item.tags : [],
                          condition: item.condition || 'Used',
                        })}
                        className="flex-1 border-vault-border text-vault-gold hover:bg-vault-gold/10"
                      >
                        <IconEdit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(item.item_id)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-vault-surface-elevated border-vault-border text-vault-text-light max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-vault-gold">
              Edit Inventory Item
            </DialogTitle>
            <DialogDescription className="text-vault-text-muted">
              Update item details and manage images
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Brand */}
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Brand
                  </label>
                  <Input
                    value={editingItem.brand}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, brand: e.target.value })
                    }
                    className="bg-vault-surface border-vault-border text-vault-text-light"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, description: e.target.value })
                    }
                    rows={3}
                    className="bg-vault-surface border-vault-border text-vault-text-light"
                  />
                </div>

                {/* Price & Condition */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                      Price
                    </label>
                    <Input
                      type="number"
                      value={editingItem.price || 0}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, price: Number(e.target.value) })
                      }
                      className="bg-vault-surface border-vault-border text-vault-text-light"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                      Condition
                    </label>
                    <Input
                      value={editingItem.condition}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, condition: e.target.value })
                      }
                      className="bg-vault-surface border-vault-border text-vault-text-light"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Tags
                  </label>
                  <Input
                    value={(editingItem.tags || []).join(', ')}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        tags: normalizeTagList(e.target.value),
                      })
                    }
                    placeholder="comma-separated tags"
                    className="bg-vault-surface border-vault-border text-vault-text-light"
                  />
                  <p className="mt-1 text-[11px] text-vault-text-muted font-body">
                    Tags improve search relevance and AI matching.
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Status
                  </label>
                  <Select
                    value={editingItem.status}
                    onValueChange={(value) =>
                      setEditingItem({ ...editingItem, status: value as InventoryStatus })
                    }
                  >
                    <SelectTrigger className="bg-vault-surface border-vault-border text-vault-text-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Images */}
                <div>
                  <label className="text-sm font-semibold text-vault-text-light mb-2 block">
                    Images ({editingItem.images?.length || 0})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(editingItem.images || []).map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-vault-black border border-vault-border">
                        <img
                          src={img}
                          alt={`Image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            const newImages = (editingItem.images || []).filter((_, i) => i !== idx);
                            setEditingItem({ ...editingItem, images: newImages });
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-vault-danger/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {(!editingItem.images || editingItem.images.length === 0) && (
                    <p className="text-xs text-vault-text-muted mt-2">No images attached</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              className="border-vault-border text-vault-text-light hover:bg-vault-hover-overlay"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
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
              Delete Item
            </DialogTitle>
            <DialogDescription className="text-vault-text-muted">
              This action cannot be undone. The inventory item will be permanently removed from the database.
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
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-vault-danger hover:bg-vault-danger/90 text-white font-semibold"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
