import { ArrowLeft, ImageUp, KeyRound, Pencil, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Field, inputClassName } from '../components/Form'
import { Modal } from '../components/Modal'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { userApi } from '../services/api'

const emptyProfile = {
  name: '',
  lastName: '',
  email: '',
  avatarUrl: '',
}

const emptyPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function cleanPayload(form) {
  return Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  )
}

function useProfileInfo() {
  const [profile, setProfile] = useState(emptyProfile)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setNotice({ tone: 'error', message: '' })
      try {
        const data = await userApi.info()
        setProfile({
          name: data.user?.name ?? '',
          lastName: data.user?.lastName ?? '',
          email: data.user?.email ?? '',
          avatarUrl: data.user?.avatarUrl ?? '',
        })
      } catch (err) {
        setNotice({ tone: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  return { profile, setProfile, notice, setNotice, loading }
}

function InfoRow({ label, value }) {
  return (
    <div className="border-b border-line py-4 last:border-b-0">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value || 'Not set'}</p>
    </div>
  )
}

export function ProfilePage({ onNavigate }) {
  const { profile, notice, loading } = useProfileInfo()

  return (
    <section>
      <PageHeader
        title="Profile"
        description="View your account information and security settings."
        action={(
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onNavigate('profile-password')}>
              <KeyRound size={16} />
              Change password
            </Button>
            <Button onClick={() => onNavigate('profile-edit')}>
              <Pencil size={16} />
              Edit profile
            </Button>
          </div>
        )}
      />

      <div className="grid max-w-3xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="rounded-md border border-line bg-panel p-5">
          {loading ? (
            <p className="text-sm text-muted">Loading profile...</p>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-4 border-b border-line pb-5">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="size-16 rounded-full object-cover ring-1 ring-line" />
                ) : (
                  <div className="grid size-16 place-items-center rounded-full bg-surface text-lg font-semibold ring-1 ring-line">
                    {profile.name?.[0] ?? 'U'}
                  </div>
                )}
                <div>
                  <p className="text-base font-semibold text-ink">{profile.name} {profile.lastName}</p>
                  <p className="text-sm text-muted">{profile.email}</p>
                </div>
              </div>
              <InfoRow label="First name" value={profile.name} />
              <InfoRow label="Last name" value={profile.lastName} />
              <InfoRow label="Email" value={profile.email} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export function ProfileEditPage({ onNavigate, onUpdated }) {
  const { profile, setProfile, notice, setNotice, loading } = useProfileInfo()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [modal, setModal] = useState({ open: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarFile])

  const submitProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      const payload = cleanPayload({
        name: profile.name,
        lastName: profile.lastName,
        email: profile.email,
      })

      if (avatarFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value))
        formData.append('avatarUrl', avatarFile)
        await userApi.update(formData)
      } else {
        await userApi.update(payload)
      }

      await onUpdated?.()
      setModal({
        open: true,
        title: 'Profile updated',
        message: 'Your account information was saved successfully.',
        confirmText: 'Back to profile',
        onConfirm: () => onNavigate('profile'),
      })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Modal open={modal.open} title={modal.title} message={modal.message} confirmText={modal.confirmText} onConfirm={modal.onConfirm} onClose={modal.onConfirm} />
      <PageHeader
        title="Edit Profile"
        description="Update your account information."
        action={(
          <Button variant="secondary" onClick={() => onNavigate('profile')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={submitProfile} className="grid max-w-3xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input className={inputClassName()} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required disabled={loading} />
          </Field>
          <Field label="Last name">
            <input className={inputClassName()} value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} required disabled={loading} />
          </Field>
        </div>
        <Field label="Email">
          <input className={inputClassName()} type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required disabled={loading} />
        </Field>
        <div className="grid gap-3">
          <p className="text-sm font-medium text-ink">Avatar</p>
          <div className="flex items-center gap-4">
            {avatarPreview || profile.avatarUrl ? (
              <img src={avatarPreview || profile.avatarUrl} alt="" className="size-16 rounded-full object-cover ring-1 ring-line" />
            ) : (
              <div className="grid size-16 place-items-center rounded-full bg-surface text-lg font-semibold ring-1 ring-line">
                {profile.name?.[0] ?? 'U'}
              </div>
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-surface">
              <ImageUp size={17} />
              Upload image
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                disabled={loading}
              />
            </label>
          </div>
          <p className="text-xs text-muted">JPG, PNG, or WEBP. Max size is 5MB.</p>
        </div>
        <Button type="submit" disabled={saving || loading} className="w-fit">
          <Save size={17} />
          {saving ? 'Saving...' : 'Save profile'}
        </Button>
      </form>
    </section>
  )
}

export function ChangePasswordPage({ onNavigate }) {
  const [password, setPassword] = useState(emptyPassword)
  const [notice, setNotice] = useState({ tone: 'error', message: '' })
  const [modal, setModal] = useState({ open: false })
  const [saving, setSaving] = useState(false)

  const submitPassword = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice({ tone: 'error', message: '' })
    try {
      await userApi.changePassword(password)
      setPassword(emptyPassword)
      setModal({
        open: true,
        title: 'Password changed',
        message: 'Your password was updated successfully.',
        confirmText: 'Back to profile',
        onConfirm: () => onNavigate('profile'),
      })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Modal open={modal.open} title={modal.title} message={modal.message} confirmText={modal.confirmText} onConfirm={modal.onConfirm} onClose={modal.onConfirm} />
      <PageHeader
        title="Change Password"
        description="Use at least 8 characters with uppercase, lowercase, number, and special character."
        action={(
          <Button variant="secondary" onClick={() => onNavigate('profile')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
      />

      <form onSubmit={submitPassword} className="grid max-w-2xl gap-5 p-5">
        <Notice tone={notice.tone}>{notice.message}</Notice>
        <Field label="Current password">
          <input className={inputClassName()} type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required />
        </Field>
        <Field label="New password">
          <input className={inputClassName()} type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} required />
        </Field>
        <Field label="Confirm new password">
          <input className={inputClassName()} type="password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} required />
        </Field>
        <Button type="submit" disabled={saving} className="w-fit">
          <Save size={17} />
          {saving ? 'Saving...' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
