import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronRight, BookOpen,
  CircleAlert, CircleUserRound, Database, Download, Eye, EyeOff, Fingerprint,
  KeyRound, LockKeyhole, LogOut, Mail, Monitor, Moon, Palette, RefreshCw,
  Save, ShieldCheck, Sun, Trash2, UserRound, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import Navbar from '../layout/Navbar.jsx'
import Sidebar from '../layout/Sidebar.jsx'
import { accountSettingsService, useNewAccountToken } from '../../services/accountSettingsService.js'
import { uploadAccountAvatar } from '../../services/accountAvatarService.js'
import './AccountSettings.css'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: CircleUserRound },
  { id: 'personal', label: 'Personal information', icon: UserRound },
  { id: 'security', label: 'Password & security', icon: ShieldCheck },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Data & privacy', icon: Database },
]
const THEMES = [
  { value: 'light', title: 'Light', description: 'Clean, bright workspace', icon: Sun },
  { value: 'dark', title: 'Dark', description: 'Reduced screen brightness', icon: Moon },
  { value: 'system', title: 'System', description: 'Match your device', icon: Monitor },
]
const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]
const prettyDate = (value) => {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
const getInitials = (name) => (name || 'F').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')

function Card({ children, className = '' }) {
  return <section className={`as-card ${className}`}>{children}</section>
}
function CardHeading({ eyebrow, title, desc, icon: Icon }) {
  return <div className="as-card-heading">
    <div className="as-card-heading-text">
      {eyebrow && <div className="as-eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
    </div>
    {Icon && <span className="as-heading-icon"><Icon size={20}/></span>}
  </div>
}
function Field({ label, hint, children }) {
  return <label className="as-field"><span className="as-field-label">{label}</span>{children}{hint && <span className="as-hint">{hint}</span>}</label>
}
function Feedback({ notice }) {
  if (!notice) return null
  const success = notice.type === 'success'
  return <div className={`as-feedback ${success ? 'as-feedback-ok' : 'as-feedback-error'}`} role={success ? 'status' : 'alert'}>
    {success ? <CheckCircle2 size={17}/> : <CircleAlert size={17}/>}
    <span>{notice.message}</span>
  </div>
}
function PasswordField({ label, value, onChange, autoComplete = 'off', placeholder = '' }) {
  const [visible, setVisible] = useState(false)
  return <Field label={label}>
    <span className="as-password-wrap"><input type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value}
      onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required minLength={1} maxLength={128}/>
      <button type="button" onClick={() => setVisible((state) => !state)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={17}/> : <Eye size={17}/>}
      </button>
    </span>
  </Field>
}

export default function AccountSettings({ user, isAuthenticated, theme, themePreference, onThemeToggle, onThemeChange, onSignOut, navbarProps, sidebarProps }) {
  const navigate = useNavigate()
  const [queryParams] = useSearchParams()
  const { refreshUser, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [section, setSection] = useState(() => SECTIONS.some((item) => item.id === queryParams.get('section')) ? queryParams.get('section') : 'overview')
  useEffect(() => {
    const requested = queryParams.get('section')
    if (SECTIONS.some((item) => item.id === requested)) setSection(requested)
  }, [queryParams])
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [profile, setProfile] = useState({ displayName: '', difficultyLevel: 'beginner' })
  const [email, setEmail] = useState({ newEmail: '', currentPassword: '' })
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [dangerOpen, setDangerOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const avatarInput = useRef(null)
  const [danger, setDanger] = useState({ confirmation: '', currentPassword: '' })

  const hydrate = useCallback((data) => {
    setAccount(data)
    setProfile({ displayName: data.displayName || '', difficultyLevel: data.difficultyLevel || 'beginner' })
  }, [])
  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try { hydrate(await accountSettingsService.get()) }
    catch (error) { setLoadError(error.message || 'Unable to load account settings.') }
    finally { setLoading(false) }
  }, [hydrate])
  useEffect(() => { if (isAuthenticated) reload() }, [isAuthenticated, reload])
  useEffect(() => { setNotice(null) }, [section])

  const submit = async (event, action, run, success) => {
    event?.preventDefault()
    if (busy) return
    setNotice(null)
    setBusy(action)
    try {
      const result = await run()
      if (success) await success(result)
      setNotice({ type: 'success', message: action === 'profile' ? 'Profile information saved to your account.' : action === 'appearance' ? 'Appearance preference saved.' : action === 'email' ? 'Email updated. Other sessions were signed out.' : action === 'password' ? 'Password changed. Other sessions were signed out.' : 'Changes saved.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Your changes could not be saved.' })
    } finally { setBusy('') }
  }

  const saveProfile = (event) => submit(event, 'profile', () => accountSettingsService.updateProfile(profile), async (result) => { hydrate(result); await refreshUser() })
  const updateEmail = (event) => submit(event, 'email', async () => {
    if (!email.newEmail.trim()) throw new Error('Enter your new email address.')
    return accountSettingsService.updateEmail(email)
  }, async (result) => {
    useNewAccountToken(result)
    hydrate(result)
    setEmail({ newEmail: '', currentPassword: '' })
    await refreshUser()
  })
  const changePassword = (event) => submit(event, 'password', async () => {
    if (password.newPassword.length < 10) throw new Error('Use a password of at least 10 characters.')
    if (password.newPassword !== password.confirmPassword) throw new Error('The new passwords do not match.')
    return accountSettingsService.updatePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword })
  }, async (result) => {
    useNewAccountToken(result)
    setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordOpen(false)
    await refreshUser()
  })
  const changeAppearance = (newTheme) => submit(null, 'appearance', () => accountSettingsService.updateAppearance(newTheme), async (result) => {
    setAccount(result)
    onThemeChange?.(newTheme)
  })
  const changePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setNotice(null)
    setBusy('avatar')
    try {
      await uploadAccountAvatar(file)
      hydrate(await accountSettingsService.get())
      await refreshUser()
      setNotice({ type: 'success', message: 'Profile photo updated.' })
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Could not save your photo.' })
    } finally { setBusy('') }
  }

  const exportData = async () => {
    if (busy) return
    setNotice(null)
    setBusy('export')
    try {
      const data = await accountSettingsService.exportData()
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `finlingo-account-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setNotice({ type: 'success', message: 'Account data export prepared. Check your Downloads folder.' })
    } catch (error) { setNotice({ type: 'error', message: error.message }) }
    finally { setBusy('') }
  }
  const deleteAccount = async (event) => {
    event.preventDefault()
    if (danger.confirmation !== 'DELETE MY ACCOUNT' || !danger.currentPassword || busy) return
    setNotice(null)
    setBusy('delete')
    try {
      await accountSettingsService.deleteAccount(danger)
      await logout()
      navigate('/', { replace: true })
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Account deletion failed.' })
      setBusy('')
    }
  }

  const initials = useMemo(() => getInitials(account?.displayName || user?.displayName), [account?.displayName, user?.displayName])
  const nav = navbarProps || { isAuthenticated, user, theme, onThemeToggle, onSignOut }
  const side = sidebarProps || { isAuthenticated, user, onSignOut }
  const selectedLabel = SECTIONS.find((item) => item.id === section)?.label || 'Overview'

  if (!isAuthenticated) return null

  return <div className="account-settings min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
    <Navbar {...nav} onSidebarToggle={() => setMobileOpen(true)} />
    <div className="flex min-h-screen">
      <Sidebar {...side} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="as-main min-w-0 flex-1">
        <div className="as-container">
          <div className="as-breadcrumb"><button type="button" onClick={() => navigate('/')}><ArrowLeft size={14}/> Home</button><ChevronRight size={13}/> Account settings</div>
          <header className="as-header">
            <div><h1>Settings</h1><p>Manage your profile, security and account preferences.</p></div>
          </header>

          {loading ? <div className="as-loading"><RefreshCw className="animate-spin" size={22}/> Loading account settings…</div>
            : loadError ? <Card className="as-error-card"><CircleAlert size={24}/><h2>We couldn't load your settings</h2><p>{loadError}</p><button type="button" className="as-btn as-btn-primary" onClick={reload}><RefreshCw size={15}/> Retry connection</button></Card>
            : <>
              <div className="as-identity-banner">
                <button type="button" className="as-avatar as-avatar-action" onClick={() => setSection('personal')} title="Manage profile photo" aria-label="Manage your profile photo">{account?.profilePicture || user?.profilePicture ? <img src={account?.profilePicture || user?.profilePicture} alt=""/> : initials}</button>
                <div className="as-identity-text"><h2>{account?.displayName || 'Account'}</h2><p>{account?.email || 'Email unavailable'}</p><button type="button" className="as-profile-link" onClick={() => navigate('/profile')}>View profile <ArrowRight size={13}/></button></div>
                <span className="as-member"><CalendarDays size={15}/> Joined {prettyDate(account?.createdAt)}</span>
              </div>

              <div className="as-layout">
                <nav className="as-section-nav" aria-label="Account settings sections">
                  {SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`as-nav-item ${section === id ? 'as-nav-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>
                    <Icon size={18}/><span>{label}</span><ChevronRight size={15} className="as-nav-chevron"/>
                  </button>)}
                  <div className="as-nav-divider"/>
                  <button type="button" onClick={onSignOut} className="as-nav-item as-signout"><LogOut size={18}/><span>Sign out</span></button>
                </nav>

                <div className="as-content" key={section}>
                  <div className="as-section-title"><h2>{selectedLabel}</h2></div>
                  <Feedback notice={notice}/>

                  {section === 'overview' && <>
                    <Card><CardHeading title="Account details" icon={CircleUserRound}/>
                      <div className="as-fact-list">
                        <div><span>Account name</span><strong>{account?.displayName}</strong></div>
                        <div><span>Email address</span><strong>{account?.email}</strong></div>
                        <div><span>Current learning level</span><strong className="capitalize">{account?.difficultyLevel || 'Beginner'}</strong></div>
                        <div><span>Account created</span><strong>{prettyDate(account?.createdAt)}</strong></div>
                      </div>
                    </Card>
                    <div className="as-quick-grid">
                      <button type="button" className="as-quick" onClick={() => setSection('personal')}><UserRound size={20}/><strong>Personal information</strong><span>Keep your name and email up to date.</span><ArrowRight size={17}/></button>
                      <button type="button" className="as-quick" onClick={() => navigate('/progress')}><BookOpen size={20}/><strong>Learning progress</strong><span>Review completed lessons and continue studying.</span><ArrowRight size={17}/></button>
                      <button type="button" className="as-quick" onClick={() => setSection('appearance')}><Palette size={20}/><strong>Your workspace</strong><span>Choose how FINLINGO looks across devices.</span><ArrowRight size={17}/></button>
                      <button type="button" className="as-quick" onClick={() => setSection('privacy')}><Database size={20}/><strong>Data controls</strong><span>Export your research and account data.</span><ArrowRight size={17}/></button>
                    </div>
                  </>}

                  {section === 'personal' && <>
                    <Card><CardHeading title="Profile details" icon={UserRound}/>
                      <div className="as-photo-row"><span className="as-small-avatar">{account?.profilePicture || user?.profilePicture ? <img src={account?.profilePicture || user?.profilePicture} alt=""/> : initials}</span><span><strong>Profile photo</strong><small>Used across your FINLINGO account.</small></span><input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload profile photo" onChange={changePhoto}/><button type="button" className="as-btn as-btn-secondary" disabled={Boolean(busy)} onClick={() => avatarInput.current?.click()}>{busy === 'avatar' ? 'Uploading…' : 'Change photo'}</button></div>
                      <form onSubmit={saveProfile} className="as-form">
                        <Field label="Display name"><input autoComplete="name" maxLength={80} minLength={2} required value={profile.displayName} onChange={(event) => setProfile((prev) => ({ ...prev, displayName: event.target.value }))}/></Field>
                        <Field label="Learning level">
                          <select value={profile.difficultyLevel} onChange={(event) => setProfile((prev) => ({ ...prev, difficultyLevel: event.target.value }))}>{LEVELS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>
                        </Field>
                        <div className="as-form-actions"><button type="submit" disabled={Boolean(busy)} className="as-btn as-btn-primary"><Save size={16}/>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></div>
                      </form>
                    </Card>
                    <Card><CardHeading title="Email address" icon={Mail}/>
                      <div className="as-current"><span>Current email</span><strong>{account?.email}</strong></div>
                      <form onSubmit={updateEmail} className="as-form">
                        <Field label="New email address"><input type="email" autoComplete="email" required maxLength={254} value={email.newEmail} onChange={(event) => setEmail((old) => ({ ...old, newEmail: event.target.value }))} placeholder="name@example.com"/></Field>
                        <PasswordField label="Current password" autoComplete="current-password" value={email.currentPassword} onChange={(value) => setEmail((old) => ({ ...old, currentPassword: value }))}/>
                        <p className="as-hint">Changing your email signs out other sessions.</p>
                        <div className="as-form-actions"><button type="submit" disabled={Boolean(busy)} className="as-btn as-btn-primary"><Mail size={16}/>{busy === 'email' ? 'Updating…' : 'Change email'}</button></div>
                      </form>
                    </Card>
                  </>}

                  {section === 'security' && <>
                    <Card><CardHeading title="Password" icon={KeyRound}/>
                      <div className="as-security-summary"><div><strong>Password-based sign-in</strong><p>Use a unique password to protect your account.</p></div>
                        {!passwordOpen && <button type="button" className="as-btn as-btn-secondary" onClick={() => setPasswordOpen(true)}>Change password <ChevronRight size={15}/></button>}</div>
                      {passwordOpen && <form onSubmit={changePassword} className="as-form as-security-form">
                        <PasswordField label="Current password" autoComplete="current-password" value={password.currentPassword} onChange={(value) => setPassword((old) => ({ ...old, currentPassword: value }))}/>
                        <PasswordField label="New password" autoComplete="new-password" value={password.newPassword} onChange={(value) => setPassword((old) => ({ ...old, newPassword: value }))} placeholder="At least 10 characters"/>
                        <PasswordField label="Confirm new password" autoComplete="new-password" value={password.confirmPassword} onChange={(value) => setPassword((old) => ({ ...old, confirmPassword: value }))}/>
                        <p className="as-hint">At least 10 characters. Other sessions will be signed out.</p>
                        <div className="as-form-actions"><button type="button" className="as-btn as-btn-secondary" disabled={Boolean(busy)} onClick={() => { setPasswordOpen(false); setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}>Cancel</button><button type="submit" disabled={Boolean(busy)} className="as-btn as-btn-primary"><LockKeyhole size={16}/>{busy === 'password' ? 'Updating…' : 'Save new password'}</button></div>
                      </form>}
                    </Card>
                    <Card><CardHeading title="Signed-in account" icon={ShieldCheck}/>
                      <div className="as-fact-list"><div><span>Sign-in email</span><strong>{account?.email}</strong></div><div><span>Authentication</span><strong>Email and password</strong></div></div>
                      <div className="as-inline-actions"><button type="button" className="as-btn as-btn-secondary" onClick={() => setSection('personal')}>Manage email <ArrowRight size={15}/></button></div>
                    </Card>
                  </>}

                  {section === 'appearance' && <>
                    <Card><CardHeading title="Appearance" desc="Choose how FINLINGO looks on your devices." icon={Palette}/>
                      <div className="as-theme-grid">{THEMES.map(({ value, title, description, icon: Icon }) => <button type="button" key={value} aria-pressed={(account?.themePreference || themePreference || 'light') === value} disabled={Boolean(busy)} className={`as-theme ${account?.themePreference === value ? 'as-theme-selected' : ''}`} onClick={() => changeAppearance(value)}>
                        <span className={`as-theme-preview as-theme-${value}`}><span className="as-theme-header"/><span className="as-theme-column"/><span className="as-theme-lines"><i/><i/><i/></span></span>
                        <span className="as-theme-name"><Icon size={16}/><strong>{title}</strong>{account?.themePreference === value && <Check size={15} className="as-theme-check"/>}</span>
                        <span className="as-theme-description">{description}</span>
                      </button>)}</div>
                    </Card>
                  </>}

                  {section === 'privacy' && <>
                    <Card><CardHeading title="Export your data" desc="Download your account information and saved research." icon={Download}/>
                      <p className="as-body-copy">Includes your Watchlist, learning progress and saved notes in JSON format.</p>
                      <button type="button" disabled={Boolean(busy)} onClick={exportData} className="as-btn as-btn-secondary"><Download size={16}/>{busy === 'export' ? 'Preparing…' : 'Download my data'}</button>
                    </Card>
                    <Card className="as-danger-card"><CardHeading title="Delete account" desc="Permanently delete your FINLINGO account and saved data." icon={Trash2}/>
                      {!dangerOpen ? <><p className="as-body-copy">This cannot be undone. Download your data first if you want to keep a copy.</p>
                        <button type="button" className="as-btn as-btn-danger-outline" onClick={() => setDangerOpen(true)}><Trash2 size={16}/> Delete account…</button></>
                        : <form onSubmit={deleteAccount} className="as-form">
                          <div className="as-danger-warning"><CircleAlert size={18}/> This action permanently deletes your account data. It is not a temporary deactivation.</div>
                          <Field label="Type DELETE MY ACCOUNT to confirm"><input required autoComplete="off" value={danger.confirmation} onChange={(event) => setDanger((old) => ({ ...old, confirmation: event.target.value }))} placeholder="DELETE MY ACCOUNT"/></Field>
                          <PasswordField label="Current password" autoComplete="current-password" value={danger.currentPassword} onChange={(value) => setDanger((old) => ({ ...old, currentPassword: value }))}/>
                          <div className="as-form-actions"><button type="button" className="as-btn as-btn-secondary" onClick={() => { setDangerOpen(false); setDanger({ confirmation: '', currentPassword: '' }) }}>Cancel</button>
                            <button type="submit" className="as-btn as-btn-danger" disabled={danger.confirmation !== 'DELETE MY ACCOUNT' || !danger.currentPassword || Boolean(busy)}><Trash2 size={16}/>{busy === 'delete' ? 'Deleting…' : 'Permanently delete account'}</button></div>
                        </form>}
                    </Card>
                  </>}
                </div>
              </div>
            </>}
        </div>
      </main>
    </div>
  </div>
}
