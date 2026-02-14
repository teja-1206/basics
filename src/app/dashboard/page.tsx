export const runtime = "nodejs";
"use client";
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  ExternalLink, 
  LogOut, 
  Wifi, 
  Search, 
  X, 
  User,
  Sparkles,
  Globe,
  Zap,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Grid,
  List,
  Star,
  Share2,
  Link2,
  Copy,
  Check,
  ArrowUpRight,
  Layers,
  Compass,
  Edit2,
  Save,
  RefreshCw
} from 'lucide-react'

interface Bookmark {
  id: string
  title: string
  url: string
  created_at: string
  favicon?: string
}

export default function DashboardPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [darkMode, setDarkMode] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [stats, setStats] = useState({ total: 0, domains: new Set<string>() })
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced')
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const [editing, setEditing] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false)
          setDeleteTarget(null)
        }
        if (editingId) {
          setEditingId(null)
          setEditTitle("")
          setEditUrl("")
        }
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        document.getElementById('title-input')?.focus()
      }
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // Focus on first bookmark's edit button if available
        if (filteredBookmarks.length > 0) {
          const firstEditButton = document.querySelector('[data-edit-button]') as HTMLButtonElement
          firstEditButton?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteModal, editingId, filteredBookmarks.length])

  useEffect(() => {
    let channel: any;
    let mounted = true;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/"
        return
      }

      setUserEmail(user.email ?? null)

      // 1. Initial Load
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (mounted && data) {
        setBookmarks(data)
        updateStats(data)
      }

      // 2. Realtime Listener with Optimistic Updates
      channel = supabase
        .channel('bookmarks-live-' + user.id)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            if (!mounted) return
            
            setSyncStatus('syncing')
            
            setTimeout(() => {
              if (mounted) {
                setSyncStatus('synced')
              }
            }, 500)

            if (payload.eventType === 'INSERT') {
              setBookmarks(prev => {
                const exists = prev.some(bm => bm.id === payload.new.id)
                if (exists) return prev
                const updated = [payload.new, ...prev]
                updateStats(updated)
                return updated
              })
              
              // Show notification
              showNotification('Bookmark added', payload.new.title)
              
            } else if (payload.eventType === 'DELETE') {
              setBookmarks(prev => {
                const updated = prev.filter(bm => String(bm.id) !== String(payload.old.id))
                updateStats(updated)
                return updated
              })
            } else if (payload.eventType === 'UPDATE') {
              setBookmarks(prev => {
                const updated = prev.map(bm => 
                  String(bm.id) === String(payload.new.id) ? payload.new : bm
                )
                updateStats(updated)
                return updated
              })
              
              // Show notification for update
              showNotification('Bookmark updated', payload.new.title)
            }
          }
        )
        .subscribe()

      // Monitor online status
      setIsOnline(navigator.onLine)
      window.addEventListener('online', () => setIsOnline(true))
      window.addEventListener('offline', () => setIsOnline(false))

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    setup()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('online', () => setIsOnline(true))
      window.removeEventListener('offline', () => setIsOnline(false))
    }
  }, [])

  // Filter bookmarks when search or bookmarks change
  useEffect(() => {
    const filtered = bookmarks.filter(bm => 
      bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredBookmarks(filtered)
  }, [searchQuery, bookmarks])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const updateStats = (bookmarksList: Bookmark[]) => {
    const domains = new Set(bookmarksList.map(bm => {
      try {
        return new URL(bm.url).hostname
      } catch {
        return 'invalid'
      }
    }))
    setStats({ total: bookmarksList.length, domains })
  }

  const showNotification = (title: string, message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return

    let formattedUrl = url.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setSaving(true)
    
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticBookmark: Bookmark = {
      id: tempId,
      title: title.trim(),
      url: formattedUrl,
      created_at: new Date().toISOString()
    }
    
    setBookmarks(prev => [optimisticBookmark, ...prev])
    setTitle("")
    setUrl("")

    const { error, data } = await supabase
      .from('bookmarks')
      .insert([{ title: title.trim(), url: formattedUrl }])
      .select()
    
    setSaving(false)

    if (error) {
      // Remove optimistic update on error
      setBookmarks(prev => prev.filter(bm => bm.id !== tempId))
      showErrorToast(error.message)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) return

    let formattedUrl = editUrl.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setEditing(true)
    
    // Optimistic update
    const originalBookmark = bookmarks.find(bm => bm.id === id)
    setBookmarks(prev => prev.map(bm => 
      bm.id === id 
        ? { ...bm, title: editTitle.trim(), url: formattedUrl }
        : bm
    ))
    
    setEditingId(null)

    const { error } = await supabase
      .from('bookmarks')
      .update({ title: editTitle.trim(), url: formattedUrl })
      .eq('id', id)
    
    setEditing(false)

    if (error) {
      // Revert on error
      if (originalBookmark) {
        setBookmarks(prev => prev.map(bm => 
          bm.id === id ? originalBookmark : bm
        ))
      }
      showErrorToast(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    // Optimistic delete
    const deletedBookmark = bookmarks.find(bm => bm.id === deleteTarget)
    setBookmarks(prev => prev.filter(bm => bm.id !== deleteTarget))
    setShowDeleteModal(false)

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', deleteTarget)
    
    if (error) {
      // Restore on error
      if (deletedBookmark) {
        setBookmarks(prev => [deletedBookmark, ...prev])
      }
      showErrorToast(error.message)
    }

    setDeleteTarget(null)
  }

  const startEditing = (bookmark: Bookmark) => {
    setEditingId(bookmark.id)
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle("")
    setEditUrl("")
  }

  const copyToClipboard = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const showErrorToast = (message: string) => {
    const toast = document.createElement('div')
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-slide-up flex items-center gap-3'
    toast.innerHTML = `
      <div class="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <p class="font-bold">Error</p>
        <p class="text-sm opacity-90">${message}</p>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 5000)
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <Trash2 size={32} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Delete Bookmark?</h3>
            <p className="text-gray-400 text-center mb-6">
              This action cannot be undone. The bookmark will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white' 
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
      }`}>
        
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto p-4 md:p-8">
          
          {/* Header with Glass Morphism */}
          <header className={`mb-8 p-6 rounded-3xl backdrop-blur-xl border transition-all ${
            darkMode 
              ? 'bg-white/5 border-white/10' 
              : 'bg-white/70 border-gray-200/50 shadow-lg'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-50"></div>
                  <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                    <Bookmark size={28} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Vault
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Your digital sanctuary
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Status Indicators */}
                <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl ${
                  darkMode ? 'bg-white/5' : 'bg-gray-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {isOnline ? (syncStatus === 'synced' ? 'Synced' : 'Syncing...') : 'Offline'}
                  </span>
                </div>

                {/* User Info */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${
                  darkMode ? 'bg-white/5' : 'bg-gray-100'
                }`}>
                  <User size={16} className="text-blue-400" />
                  <span className="text-sm font-medium max-w-[150px] truncate">
                    {userEmail || 'Loading...'}
                  </span>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-xl transition-all ${
                    darkMode 
                      ? 'bg-white/5 hover:bg-white/10 text-yellow-400' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-medium text-white transition-all shadow-lg shadow-red-500/25"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Layers, label: 'Total', value: stats.total, color: 'blue' },
              { icon: Compass, label: 'Domains', value: stats.domains.size, color: 'purple' },
              { icon: Clock, label: 'Today', value: bookmarks.filter(b => new Date(b.created_at).toDateString() === new Date().toDateString()).length, color: 'pink' },
              { icon: Zap, label: 'Active', value: 'Real-time', color: 'green' }
            ].map((stat, index) => (
              <div
                key={index}
                className={`p-4 rounded-2xl backdrop-blur-xl border ${
                  darkMode 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-white/70 border-gray-200/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${stat.color}-500/20 rounded-xl`}>
                    <stat.icon size={20} className={`text-${stat.color}-400`} />
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} size={20} />
              <input 
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks... (⌘/)"
                className={`w-full pl-14 pr-12 py-5 rounded-2xl outline-none transition-all ${
                  darkMode 
                    ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white' 
                    : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-lg ${
                    darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-4 rounded-xl transition-all ${
                  viewMode === 'grid'
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-4 rounded-xl transition-all ${
                  viewMode === 'list'
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Add Bookmark Form */}
          <form onSubmit={handleSave} className={`mb-8 p-6 rounded-3xl backdrop-blur-xl border transition-all ${
            darkMode 
              ? 'bg-white/5 border-white/10' 
              : 'bg-white/70 border-gray-200/50 shadow-lg'
          }`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  id="title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bookmark title"
                  className={`w-full px-5 py-4 rounded-xl outline-none transition-all ${
                    darkMode 
                      ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white' 
                      : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex-[2]">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full px-5 py-4 rounded-xl outline-none transition-all ${
                    darkMode 
                      ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white' 
                      : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
              >
                {saving ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Saving</span>
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
            <p className={`mt-3 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
              <Zap size={12} />
              Tip: Press ⌘N to quickly add a new bookmark
            </p>
          </form>

          {/* Bookmarks Grid/List */}
          {filteredBookmarks.length === 0 ? (
            <div className={`text-center py-20 px-4 rounded-3xl backdrop-blur-xl border ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'
            }`}>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center">
                <Bookmark size={48} className="text-blue-400/50" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No bookmarks yet</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                Add your first bookmark using the form above
              </p>
              <button
                onClick={() => document.getElementById('title-input')?.focus()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-medium inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add your first bookmark
              </button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'flex flex-col gap-3'
            }>
              {filteredBookmarks.map((bm, index) => (
                <div
                  key={bm.id}
                  className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-slide-up ${
                    darkMode 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                      : 'bg-white/70 border-gray-200/50 hover:bg-white/90'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Gradient Border on Hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl" />
                  
                  <div className="relative p-5">
                    {editingId === bm.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          className={`w-full px-4 py-2 rounded-xl outline-none transition-all ${
                            darkMode 
                              ? 'bg-white/10 border border-white/20 focus:border-blue-500/50 text-white' 
                              : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                          }`}
                        />
                        <input
                          type="text"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="URL"
                          className={`w-full px-4 py-2 rounded-xl outline-none transition-all ${
                            darkMode 
                              ? 'bg-white/10 border border-white/20 focus:border-blue-500/50 text-white' 
                              : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                          }`}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(bm.id)}
                            disabled={editing}
                            className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-medium text-white transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
                          >
                            {editing ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                            <span>Save</span>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start gap-4">
                        {/* Icon/Favicon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          {bm.favicon ? (
                            <img src={bm.favicon} alt="" className="w-6 h-6" />
                          ) : (
                            <Globe size={24} className="text-blue-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-lg truncate">{bm.title}</h3>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyToClipboard(bm.url, bm.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  darkMode 
                                    ? 'hover:bg-white/10' 
                                    : 'hover:bg-gray-200'
                                }`}
                                title="Copy URL"
                              >
                                {copiedId === bm.id ? (
                                  <Check size={14} className="text-green-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                              <a
                                href={bm.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-all ${
                                  darkMode 
                                    ? 'hover:bg-blue-600/20 text-blue-400' 
                                    : 'hover:bg-blue-100 text-blue-600'
                                }`}
                                title="Open link"
                              >
                                <ArrowUpRight size={14} />
                              </a>
                              <button
                                onClick={() => startEditing(bm)}
                                data-edit-button
                                className={`p-2 rounded-lg transition-all ${
                                  darkMode 
                                    ? 'hover:bg-yellow-600/20 text-yellow-400' 
                                    : 'hover:bg-yellow-100 text-yellow-600'
                                }`}
                                title="Edit bookmark"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(bm.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  darkMode 
                                    ? 'hover:bg-red-600/20 text-red-400' 
                                    : 'hover:bg-red-100 text-red-600'
                                }`}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <p className={`text-sm truncate flex-1 ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {getDomain(bm.url)}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              darkMode ? 'bg-white/5' : 'bg-gray-100'
                            }`}>
                              {new Date(bm.created_at).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>

                          {viewMode === 'list' && (
                            <p className={`text-xs mt-2 truncate ${
                              darkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {bm.url}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer with Stats */}
          <footer className={`mt-12 p-6 rounded-2xl backdrop-blur-xl border ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Lock size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Private & Secure
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Real-time Sync
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {filteredBookmarks.length} of {bookmarks.length} bookmarks shown
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Press ⌘E to edit
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}