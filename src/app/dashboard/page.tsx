"use client";
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Bookmark, Plus, Trash2, ExternalLink, LogOut, Wifi, Search, X, User,
  Globe, Zap, Lock, Clock, Moon, Sun, Grid, List,
  Copy, Check, ArrowUpRight, Layers, Compass, Edit2, Save, RefreshCw
} from 'lucide-react'

interface BookmarkItem {
  id: string
  title: string
  url: string
  created_at: string
}

export default function DashboardPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([])
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
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const [editing, setEditing] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const stats = {
    total: bookmarks.length,
    domains: new Set(bookmarks.map(bm => { try { return new URL(bm.url).hostname } catch { return 'invalid' } })),
    today: bookmarks.filter(b => new Date(b.created_at).toDateString() === new Date().toDateString()).length
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (showDeleteModal) { setShowDeleteModal(false); setDeleteTarget(null) }
        if (editingId) cancelEditing()
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        document.getElementById('title-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteModal, editingId])

  useEffect(() => {
    let channel: any
    let mounted = true

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/"; return }
      setUserEmail(user.email ?? null)

      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false })
      if (mounted && data) setBookmarks(data)

      channel = supabase
        .channel('bookmarks-live-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`
        }, (payload: any) => {
          if (!mounted) return
          setSyncStatus('syncing')
          setTimeout(() => { if (mounted) setSyncStatus('synced') }, 600)

          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => {
              if (prev.some(bm => String(bm.id) === String(payload.new.id))) return prev
              return [payload.new, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(bm => String(bm.id) !== String(payload.old.id)))
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks(prev => prev.map(bm =>
              String(bm.id) === String(payload.new.id) ? payload.new : bm
            ))
          }
        })
        .subscribe()

      setIsOnline(navigator.onLine)
      window.addEventListener('online', () => setIsOnline(true))
      window.addEventListener('offline', () => setIsOnline(false))
    }

    setup()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    setFilteredBookmarks(
      bookmarks.filter(bm =>
        bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bm.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [searchQuery, bookmarks])

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = "/"; return }

    let formattedUrl = url.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setSaving(true)
    const { error } = await supabase
      .from('bookmarks')
      .insert([{ title: title.trim(), url: formattedUrl, user_id: user.id }])
    setSaving(false)

    if (error) {
      showErrorToast(error.message)
    } else {
      setTitle("")
      setUrl("")
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editUrl.trim()) return

    let formattedUrl = editUrl.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setEditing(true)
    const { error } = await supabase
      .from('bookmarks')
      .update({ title: editTitle.trim(), url: formattedUrl })
      .eq('id', id)
    setEditing(false)
    setEditingId(null)

    if (error) showErrorToast(error.message)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setShowDeleteModal(false)
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', deleteTarget)
    setDeleteTarget(null)
    if (error) showErrorToast(error.message)
  }

  const startEditing = (bm: BookmarkItem) => {
    setEditingId(bm.id)
    setEditTitle(bm.title)
    setEditUrl(bm.url)
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
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  }

  const showErrorToast = (message: string) => {
    const toast = document.createElement('div')
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3'
    toast.innerHTML = `<div><p class="font-bold">Error</p><p class="text-sm opacity-90">${message}</p></div>`
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 5000)
  }

  return (
    <>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <Trash2 size={32} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Delete Bookmark?</h3>
            <p className="text-gray-400 text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold text-white transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen transition-colors duration-500 ${
        darkMode ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white'
                 : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
      }`}>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>

        <div className="relative max-w-7xl mx-auto p-4 md:p-8">
          <header className={`mb-8 p-6 rounded-3xl backdrop-blur-xl border ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50 shadow-lg'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-50" />
                  <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                    <Bookmark size={28} className="text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Vault</h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your digital sanctuary</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{isOnline ? (syncStatus === 'synced' ? 'Synced' : 'Syncing...') : 'Offline'}</span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <User size={16} className="text-blue-400" />
                  <span className="text-sm font-medium max-w-[150px] truncate">{userEmail}</span>
                </div>
                <button onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-xl transition-all ${darkMode ? 'bg-white/5 hover:bg-white/10 text-yellow-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-medium text-white transition-all">
                  <LogOut size={16} />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Layers, label: 'Total', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/20' },
              { icon: Compass, label: 'Domains', value: stats.domains.size, color: 'text-purple-400', bg: 'bg-purple-500/20' },
              { icon: Clock, label: 'Today', value: stats.today, color: 'text-pink-400', bg: 'bg-pink-500/20' },
              { icon: Zap, label: 'Active', value: 'Real-time', color: 'text-green-400', bg: 'bg-green-500/20' }
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-2xl backdrop-blur-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${stat.bg} rounded-xl`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks... (⌘/)"
                className={`w-full pl-14 pr-12 py-5 rounded-2xl outline-none transition-all ${
                  darkMode ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white'
                           : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                }`} />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className={`absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-lg ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {(['grid', 'list'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`p-4 rounded-xl transition-all ${
                    viewMode === mode ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                  {mode === 'grid' ? <Grid size={20} /> : <List size={20} />}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSave} className={`mb-8 p-6 rounded-3xl backdrop-blur-xl border ${
            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50 shadow-lg'
          }`}>
            <div className="flex flex-col md:flex-row gap-4">
              <input id="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bookmark title"
                className={`flex-1 px-5 py-4 rounded-xl outline-none transition-all ${
                  darkMode ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white'
                           : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                }`} />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com"
                className={`flex-[2] px-5 py-4 rounded-xl outline-none transition-all ${
                  darkMode ? 'bg-white/5 border border-white/10 focus:border-blue-500/50 text-white'
                           : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                }`} />
              <button type="submit" disabled={saving}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[120px]">
                {saving ? <><RefreshCw size={20} className="animate-spin" /><span>Saving</span></> : <><Plus size={20} /><span>Add</span></>}
              </button>
            </div>
            <p className={`mt-3 text-xs flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Zap size={12} /> Tip: Press ⌘N to quickly add a new bookmark
            </p>
          </form>

          {filteredBookmarks.length === 0 ? (
            <div className={`text-center py-20 rounded-3xl backdrop-blur-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'}`}>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center">
                <Bookmark size={48} className="text-blue-400/50" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{searchQuery ? 'No results found' : 'No bookmarks yet'}</h3>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {searchQuery ? 'Try a different search term' : 'Add your first bookmark above'}
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
              {filteredBookmarks.map((bm, index) => (
                <div key={bm.id}
                  className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/70 border-gray-200/50 hover:bg-white/90'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-2xl" />
                  <div className="relative p-5">
                    {editingId === bm.id ? (
                      <div className="space-y-3">
                        <input ref={editInputRef} type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title"
                          className={`w-full px-4 py-2 rounded-xl outline-none transition-all ${
                            darkMode ? 'bg-white/10 border border-white/20 focus:border-blue-500/50 text-white'
                                     : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                          }`} />
                        <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL"
                          className={`w-full px-4 py-2 rounded-xl outline-none transition-all ${
                            darkMode ? 'bg-white/10 border border-white/20 focus:border-blue-500/50 text-white'
                                     : 'bg-white border border-gray-200 focus:border-blue-500 text-gray-900'
                          }`} />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(bm.id)} disabled={editing}
                            className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2">
                            {editing ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Save</span>
                          </button>
                          <button onClick={cancelEditing} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Globe size={24} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-lg truncate">{bm.title}</h3>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => copyToClipboard(bm.url, bm.id)}
                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
                                {copiedId === bm.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              </button>
                              <a href={bm.url} target="_blank" rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-blue-600/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}>
                                <ArrowUpRight size={14} />
                              </a>
                              <button onClick={() => startEditing(bm)}
                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-yellow-600/20 text-yellow-400' : 'hover:bg-yellow-100 text-yellow-600'}`}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => { setDeleteTarget(bm.id); setShowDeleteModal(true) }}
                                className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-red-600/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <p className={`text-sm truncate flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getDomain(bm.url)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                              {new Date(bm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {viewMode === 'list' && (
                            <p className={`text-xs mt-2 truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{bm.url}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className={`mt-12 p-6 rounded-2xl backdrop-blur-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Lock size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Private & Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Real-time Sync</span>
                </div>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {filteredBookmarks.length} of {bookmarks.length} bookmarks shown
              </p>
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
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}</style>
    </>
  )
}