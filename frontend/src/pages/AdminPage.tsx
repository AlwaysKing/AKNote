import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api/users';
import { spacesApi, Space, SpaceMember } from '../api/spaces';
import { Trash2, Edit2, Plus, X, UserPlus, Smile, ChevronDown, Check } from 'lucide-react';

interface EditingUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  isEditing?: boolean;
}

const ICON_OPTIONS = ['📚', '📝', '💼', '🏠', '🎨', '🔬', '📊', '🗂️', '💡', '🚀', '🎯', '✅', '📋', '📁', '🔧', '💬', '🌟', '🎓', '🎵', '🌍', '🔒', '📱', '☕', '🔮'];

const roleLabels: Record<string, string> = {
  admin: '管理员',
  editor: '编辑',
  viewer: '只读',
};

export default function AdminPage() {
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'users';

  const { user: currentUser } = useAuthStore();

  // ---- 用户管理状态 ----
  const [users, setUsers] = useState<EditingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', display_name: '', role: 'user' });
  const [error, setError] = useState('');

  // ---- 空间管理状态 ----
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  // 统一面板: null=关闭, 'new'=创建, slug=编辑
  const [spacePanelSlug, setSpacePanelSlug] = useState<string | null>(null);
  const [spaceFormData, setSpaceFormData] = useState({ name: '', icon: '', description: '' });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  // ---- 成员管理状态 ----
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [allUsers, setAllUsers] = useState<{ id: number; username: string; display_name: string }[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({ user_id: 0, role: 'viewer' });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNewRoleDropdown, setShowNewRoleDropdown] = useState(false);
  const [openMemberRoleId, setOpenMemberRoleId] = useState<number | null>(null);
  const dropdownsRef = useRef<HTMLDivElement>(null);

  // ---- 图标选择器点击外部关闭 ----
  useEffect(() => {
    if (!showIconPicker) return;
    const handler = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [showIconPicker]);

  // ---- 自定义下拉菜单点击外部关闭 ----
  useEffect(() => {
    if (!showUserDropdown && !showNewRoleDropdown && openMemberRoleId === null) return;
    const handler = (e: MouseEvent) => {
      if (dropdownsRef.current && !dropdownsRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
        setShowNewRoleDropdown(false);
        setOpenMemberRoleId(null);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [showUserDropdown, showNewRoleDropdown, openMemberRoleId]);

  // ---- 数据获取 ----
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'spaces') {
      fetchSpaces();
      fetchAllUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const fetchSpaces = async () => {
    setSpacesLoading(true);
    try {
      const data = await spacesApi.listAll();
      setSpaces(data);
      // 获取每个空间的成员数
      const counts: Record<string, number> = {};
      await Promise.all(data.map(async (s: Space) => {
        try {
          const members = await spacesApi.getMembers(s.slug);
          counts[s.slug] = members.length;
        } catch {
          counts[s.slug] = 0;
        }
      }));
      setMemberCounts(counts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSpacesLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await usersApi.list();
      setAllUsers(data.map((u: any) => ({ id: u.id, username: u.username, display_name: u.display_name })));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchMembers = async (slug: string) => {
    try {
      const data = await spacesApi.getMembers(slug);
      setMembers(data ?? []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- 用户管理操作 ----
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await usersApi.create(newUser);
      setUsers([...users, { ...created, isEditing: false }]);
      setNewUser({ username: '', password: '', display_name: '', role: 'user' });
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (id === currentUser?.id) { setError('不能删除自己的账号'); return; }
    try {
      await usersApi.delete(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (id: number, updates: Partial<EditingUser>) => {
    try {
      const updated = await usersApi.update(id, updates);
      setUsers(users.map((u) => (u.id === id ? { ...updated, isEditing: false } : u)));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleEdit = (id: number) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, isEditing: !u.isEditing } : u)));
  };

  // ---- 空间面板操作 ----
  const openCreatePanel = () => {
    setSpaceFormData({ name: '', icon: '', description: '' });
    setMembers([]);
    setSpacePanelSlug('new');
    setIsAddingMember(false);
  };

  const openEditPanel = async (space: Space) => {
    setSpaceFormData({ name: space.name, icon: space.icon || '', description: space.description || '' });
    setSpacePanelSlug(space.slug);
    setIsAddingMember(false);
    await fetchMembers(space.slug);
  };

  const closePanel = () => {
    setSpacePanelSlug(null);
    setMembers([]);
    setIsAddingMember(false);
    setShowIconPicker(false);
    setShowUserDropdown(false);
    setShowNewRoleDropdown(false);
    setOpenMemberRoleId(null);
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceFormData.name.trim()) return;
    try {
      if (spacePanelSlug === 'new') {
        await spacesApi.create(spaceFormData);
      } else {
        await spacesApi.update(spacePanelSlug!, spaceFormData);
      }
      closePanel();
      fetchSpaces();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteSpace = async (slug: string) => {
    if (!window.confirm('确定要删除此空间吗？所有页面数据将被永久删除。')) return;
    try {
      await spacesApi.delete(slug);
      setSpaces(spaces.filter((s) => s.slug !== slug));
      if (spacePanelSlug === slug) closePanel();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- 成员操作 ----
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spacePanelSlug || spacePanelSlug === 'new' || !newMember.user_id) return;
    try {
      await spacesApi.addMember(spacePanelSlug, newMember);
      setNewMember({ user_id: 0, role: 'viewer' });
      setIsAddingMember(false);
      fetchMembers(spacePanelSlug);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateMemberRole = async (memberId: number, role: string) => {
    if (!spacePanelSlug || spacePanelSlug === 'new') return;
    try {
      await spacesApi.updateMember(spacePanelSlug, memberId, role);
      fetchMembers(spacePanelSlug);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!spacePanelSlug || spacePanelSlug === 'new') return;
    try {
      await spacesApi.removeMember(spacePanelSlug, memberId);
      fetchMembers(spacePanelSlug);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- 加载中 ----
  if (activeTab === 'users' && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-text"></div>
      </div>
    );
  }

  // ---- 用户管理视图 ----
  const renderUsers = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-notion-text">用户管理</h1>
        <button onClick={() => setIsCreating(!isCreating)} className="flex items-center gap-2 px-4 py-2 bg-notion-text text-white rounded-lg hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" />添加用户
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div>}

      {isCreating && (
        <form onSubmit={handleCreateUser} className="bg-notion-sidebarBg rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-notion-text mb-4">创建新用户</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-notion-text mb-1">用户名</label>
              <input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="w-full px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-notion-text mb-1">密码</label>
              <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-notion-text mb-1">显示名称</label>
              <input type="text" value={newUser.display_name} onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })} className="w-full px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-notion-text mb-1">角色</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-notion-text text-white rounded hover:bg-gray-700 transition-colors">创建用户</button>
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 border border-notion-border rounded hover:bg-notion-hover transition-colors">取消</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-notion-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-notion-sidebarBg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">用户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">用户名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-notion-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-notion-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-notion-hover transition-colors">
                {user.isEditing ? (
                  <>
                    <td className="px-6 py-4"><input type="text" defaultValue={user.display_name} onBlur={(e) => handleUpdateUser(user.id, { display_name: e.target.value })} className="w-full px-2 py-1 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" /></td>
                    <td className="px-6 py-4 text-notion-textSecondary">{user.username}</td>
                    <td className="px-6 py-4"><select defaultValue={user.role} onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as 'admin' | 'user' })} className="px-2 py-1 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="user">普通用户</option><option value="admin">管理员</option></select></td>
                    <td className="px-6 py-4 text-notion-textSecondary">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => toggleEdit(user.id)} className="text-notion-textSecondary hover:text-notion-text"><X className="w-4 h-4" /></button></td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4"><div className="flex items-center gap-3">{user.avatar_url && <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full" />}<span className="font-medium text-notion-text">{user.display_name}</span></div></td>
                    <td className="px-6 py-4 text-notion-textSecondary">{user.username}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{user.role}</span></td>
                    <td className="px-6 py-4 text-notion-textSecondary">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => toggleEdit(user.id)} className="text-notion-textSecondary hover:text-notion-text" title="编辑"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4" /></button></div></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  // ---- 渲染内联展开面板 ----
  const renderInlinePanel = (isEditing: boolean) => {
    const availableUsers = allUsers.filter(u => !(members ?? []).some(m => m.user_id === u.id));

    return (
      <form onSubmit={handleSavePanel} className="p-6">
        {/* 第一行：图标 + 名称 + 描述 */}
        <div className="flex items-center gap-3">
          {/* 图标按钮 */}
          <div className="relative" ref={iconPickerRef}>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-10 h-10 rounded border border-notion-border hover:bg-notion-hover flex items-center justify-center text-lg transition-colors"
              title="选择图标"
            >
              {spaceFormData.icon || <Smile className="w-5 h-5 text-notion-textSecondary" />}
            </button>
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-notion-border rounded-lg shadow-lg p-2 z-50 w-[260px]">
                <div className="grid grid-cols-8 gap-1">
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setSpaceFormData({ ...spaceFormData, icon: emoji }); setShowIconPicker(false); }}
                      className={`w-8 h-8 rounded hover:bg-notion-hover flex items-center justify-center text-base transition-colors ${spaceFormData.icon === emoji ? 'bg-notion-hover ring-1 ring-blue-400' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 名称 */}
          <input
            type="text"
            value={spaceFormData.name}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, name: e.target.value })}
            placeholder="空间名称"
            className="flex-1 px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {/* 描述 */}
          <input
            type="text"
            value={spaceFormData.description}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, description: e.target.value })}
            placeholder="描述（可选）"
            className="flex-1 px-3 py-2 border border-notion-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 成员区域（仅编辑模式） */}
        {isEditing && (
          <div className="border-t border-notion-border mt-5 pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-notion-text">成员</span>
              <button
                type="button"
                onClick={() => setIsAddingMember(!isAddingMember)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-notion-text text-white rounded hover:bg-gray-700 transition-colors"
              >
                <UserPlus className="w-3 h-3" />添加成员
              </button>
            </div>

            {/* 添加成员行 */}
            {isAddingMember && (
              <div className="flex items-center gap-2 mb-3 bg-white rounded-lg p-3" ref={dropdownsRef}>
                {/* 用户选择下拉 */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNewRoleDropdown(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 border border-notion-border rounded text-sm hover:bg-notion-hover transition-colors"
                  >
                    <span className={newMember.user_id ? 'text-notion-text' : 'text-notion-textSecondary'}>
                      {newMember.user_id ? availableUsers.find(u => u.id === newMember.user_id)?.display_name || '选择用户' : '选择用户'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-notion-textSecondary flex-shrink-0" />
                  </button>
                  {showUserDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-notion-border rounded-lg shadow-lg z-50 min-w-[200px] max-h-[240px] overflow-y-auto py-1">
                      {availableUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-notion-textSecondary">没有可添加的用户</div>
                      ) : (
                        availableUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setNewMember({ ...newMember, user_id: u.id }); setShowUserDropdown(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover transition-colors ${newMember.user_id === u.id ? 'bg-notion-hover text-notion-text' : 'text-notion-text'}`}
                          >
                            {u.display_name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 权限选择下拉 */}
                <div className="relative w-24">
                  <button
                    type="button"
                    onClick={() => { setShowNewRoleDropdown(!showNewRoleDropdown); setShowUserDropdown(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 border border-notion-border rounded text-sm hover:bg-notion-hover transition-colors"
                  >
                    <span className="text-notion-text">{newMember.role === 'editor' ? '编辑' : '只读'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-notion-textSecondary flex-shrink-0" />
                  </button>
                  {showNewRoleDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-notion-border rounded-lg shadow-lg z-50 min-w-[100px] py-1">
                      <button type="button" onClick={() => { setNewMember({ ...newMember, role: 'editor' }); setShowNewRoleDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover transition-colors ${newMember.role === 'editor' ? 'bg-notion-hover' : ''}`}>编辑</button>
                      <button type="button" onClick={() => { setNewMember({ ...newMember, role: 'viewer' }); setShowNewRoleDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover transition-colors ${newMember.role === 'viewer' ? 'bg-notion-hover' : ''}`}>只读</button>
                    </div>
                  )}
                </div>

                <button type="button" onClick={handleAddMember} className="p-1.5 text-notion-textSecondary hover:text-notion-text transition-colors" title="添加"><Check className="w-4 h-4" /></button>
                <button type="button" onClick={() => setIsAddingMember(false)} className="px-2 py-1.5 text-notion-textSecondary hover:text-notion-text"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* 成员列表 */}
            {members.length === 0 ? (
              <p className="text-sm text-notion-textSecondary py-2">暂无成员</p>
            ) : (
              <div className="space-y-0.5">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-notion-hover transition-colors group">
                    <span className="text-sm text-notion-text">{member.user.display_name}</span>
                    <div className="flex items-center gap-2" ref={openMemberRoleId === member.id ? dropdownsRef : undefined}>
                      {/* 成员权限下拉 */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setOpenMemberRoleId(openMemberRoleId === member.id ? null : member.id); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-notion-hover transition-colors text-notion-textSecondary"
                        >
                          <span>{roleLabels[member.role] || member.role}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openMemberRoleId === member.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-notion-border rounded-lg shadow-lg z-50 min-w-[100px] py-1">
                            <button type="button" onClick={() => { handleUpdateMemberRole(member.id, 'editor'); setOpenMemberRoleId(null); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover transition-colors ${member.role === 'editor' ? 'bg-notion-hover' : ''}`}>编辑</button>
                            <button type="button" onClick={() => { handleUpdateMemberRole(member.id, 'viewer'); setOpenMemberRoleId(null); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-notion-hover transition-colors ${member.role === 'viewer' ? 'bg-notion-hover' : ''}`}>只读</button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-5">
          <button type="submit" className="px-4 py-2 bg-notion-text text-white rounded hover:bg-gray-700 transition-colors">
            {isEditing ? '保存' : '创建'}
          </button>
          <button type="button" onClick={closePanel} className="px-4 py-2 border border-notion-border rounded hover:bg-notion-hover transition-colors">取消</button>
        </div>
      </form>
    );
  };

  // ---- 空间管理视图 ----
  const renderSpaces = () => {
    if (spacesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-text"></div>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-notion-text">空间管理</h1>
          <button onClick={openCreatePanel} className="flex items-center gap-2 px-4 py-2 bg-notion-text text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Plus className="w-4 h-4" />创建空间
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div>}

        <div className="bg-white rounded-lg border border-notion-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-notion-sidebarBg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">空间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-notion-textSecondary uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-notion-textSecondary uppercase tracking-wider">成员</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-notion-textSecondary uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-notion-border">
              {/* 创建面板 — 插入到列表顶部 */}
              {spacePanelSlug === 'new' && (
                <tr className="bg-notion-sidebarBg/30">
                  <td colSpan={5}>{renderInlinePanel(false)}</td>
                </tr>
              )}
              {spaces.map((space) => (
                spacePanelSlug === space.slug ? (
                  // 编辑模式：该行展开为面板
                  <tr key={space.slug} className="bg-notion-sidebarBg/30">
                    <td colSpan={5}>{renderInlinePanel(true)}</td>
                  </tr>
                ) : (
                  // 正常行
                  <tr key={space.slug} className="hover:bg-notion-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {space.icon && <span>{space.icon}</span>}
                        <span className="font-medium text-notion-text">{space.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-notion-textSecondary">{space.description || '-'}</td>
                    <td className="px-6 py-4 text-notion-textSecondary">{new Date(space.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center text-notion-textSecondary text-sm">{memberCounts[space.slug] ?? '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditPanel(space)} className="text-notion-textSecondary hover:text-notion-text" title="编辑"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteSpace(space.slug)} className="text-red-500 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {activeTab === 'users' ? renderUsers() : renderSpaces()}
      </div>
    </div>
  );
}
