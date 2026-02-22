'use client'

import * as React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type JoinStrategy = 'approval' | 'free' | 'passcode'

interface FormData {
  name: string
  description: string
  joinStrategy: JoinStrategy
  passcode: string
  inviteeEmail: string
}

interface FormErrors {
  name?: string
  inviteeEmail?: string
  passcode?: string
  submit?: string
}

export function CreateRoomDialog({ open, onOpenChange, onSuccess }: CreateRoomDialogProps) {
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    description: '',
    joinStrategy: 'approval',
    passcode: '',
    inviteeEmail: '',
  })
  
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate room name
    if (!formData.name.trim()) {
      newErrors.name = 'Room 名称不能为空'
    }

    // Validate at least one invitee (需求 3.1)
    if (!formData.inviteeEmail.trim()) {
      newErrors.inviteeEmail = '必须邀请至少一名用户'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inviteeEmail)) {
      newErrors.inviteeEmail = '请输入有效的邮箱地址'
    }

    // Validate password for passcode strategy (需求 3.3)
    if (formData.joinStrategy === 'passcode' && !formData.passcode.trim()) {
      newErrors.passcode = '密码加入策略需要设置密码'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const supabase = createClient()

      // Get current user to ensure they're authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('用户未登录')
      }

      // Call the create-room API endpoint
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          joinStrategy: formData.joinStrategy,
          passcode: formData.passcode || undefined,
          inviteeEmails: [formData.inviteeEmail], // Convert single email to array
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '创建 Room 失败')
      }

      const result = await response.json()

      // Show warning if some invitees were not found
      if (result.warning) {
        console.warn(result.warning)
      }

      // Success! Close dialog and notify parent
      onOpenChange(false)
      onSuccess?.()

      // Reset form
      setFormData({
        name: '',
        description: '',
        joinStrategy: 'approval',
        passcode: '',
        inviteeEmail: '',
      })
    } catch (error) {
      console.error('Error creating room:', error)
      setErrors({
        submit: error instanceof Error ? error.message : '创建 Room 失败，请重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>创建新 Room</DialogTitle>
        <DialogDescription>
          创建一个新的讨论空间，邀请至少一名用户加入
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Room 名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="例如：产品设计讨论"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Room Description */}
        <div className="space-y-2">
          <Label htmlFor="description">描述（可选）</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="简要描述这个 Room 的用途"
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Join Strategy (需求 3.2) */}
        <div className="space-y-2">
          <Label htmlFor="joinStrategy">
            加入策略 <span className="text-red-500">*</span>
          </Label>
          <Select
            id="joinStrategy"
            value={formData.joinStrategy}
            onChange={(e) => handleInputChange('joinStrategy', e.target.value as JoinStrategy)}
            disabled={isSubmitting}
          >
            <option value="approval">申请审批（默认）</option>
            <option value="free">自由加入</option>
            <option value="passcode">密码加入</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            {formData.joinStrategy === 'approval' && '新成员需要您的批准才能加入'}
            {formData.joinStrategy === 'free' && '任何人都可以直接加入'}
            {formData.joinStrategy === 'passcode' && '需要密码才能加入'}
          </p>
        </div>

        {/* Passcode (需求 3.3) */}
        {formData.joinStrategy === 'passcode' && (
          <div className="space-y-2">
            <Label htmlFor="passcode">
              加入密码 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="passcode"
              type="password"
              value={formData.passcode}
              onChange={(e) => handleInputChange('passcode', e.target.value)}
              placeholder="设置加入密码"
              disabled={isSubmitting}
            />
            {errors.passcode && (
              <p className="text-sm text-red-500">{errors.passcode}</p>
            )}
            <p className="text-xs text-muted-foreground">
              密码将使用 bcrypt 加密存储
            </p>
          </div>
        )}

        {/* Invitee Email (需求 3.1) */}
        <div className="space-y-2">
          <Label htmlFor="inviteeEmail">
            邀请用户（邮箱）<span className="text-red-500">*</span>
          </Label>
          <Input
            id="inviteeEmail"
            type="email"
            value={formData.inviteeEmail}
            onChange={(e) => handleInputChange('inviteeEmail', e.target.value)}
            placeholder="user@example.com"
            disabled={isSubmitting}
          />
          {errors.inviteeEmail && (
            <p className="text-sm text-red-500">{errors.inviteeEmail}</p>
          )}
          <p className="text-xs text-muted-foreground">
            必须邀请至少一名用户才能创建 Room
          </p>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{errors.submit}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '创建中...' : '创建 Room'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
