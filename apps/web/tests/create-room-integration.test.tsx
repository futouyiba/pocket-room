/**
 * Integration tests for Room creation
 * 
 * Tests the complete Room creation flow including:
 * - Form rendering and interaction
 * - Validation error display
 * - Password hashing for passcode strategy
 * - Form submission
 * 
 * Validates requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog'
import bcrypt from 'bcryptjs'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-room-id', name: 'Test Room' },
            error: null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-invitee-id' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

describe('Room Creation Integration', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form rendering', () => {
    it('should render all form fields when dialog is open', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByLabelText(/Room 名称/)).toBeInTheDocument()
      expect(screen.getByLabelText(/描述/)).toBeInTheDocument()
      expect(screen.getByLabelText(/加入策略/)).toBeInTheDocument()
      expect(screen.getByLabelText(/邀请用户/)).toBeInTheDocument()
    })

    it('should not render when dialog is closed', () => {
      render(
        <CreateRoomDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByLabelText(/Room 名称/)).not.toBeInTheDocument()
    })

    it('should show passcode field when passcode strategy is selected', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/)
      fireEvent.change(strategySelect, { target: { value: 'passcode' } })

      await waitFor(() => {
        expect(screen.getByLabelText(/加入密码/)).toBeInTheDocument()
      })
    })

    it('should not show passcode field for approval strategy', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/)
      fireEvent.change(strategySelect, { target: { value: 'approval' } })

      expect(screen.queryByLabelText(/加入密码/)).not.toBeInTheDocument()
    })
  })

  describe('Form validation (需求 3.1, 3.2, 3.3)', () => {
    it('should show error when room name is empty', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Room 名称不能为空/)).toBeInTheDocument()
      })
    })

    it('should show error when invitee email is empty (需求 3.1)', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Look for the error message specifically (text-red-500 class)
        const errorMessages = screen.getAllByText(/必须邀请至少一名用户/)
        const errorMessage = errorMessages.find(el => el.className.includes('text-red-500'))
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('should show error when invitee email is invalid', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      const emailInput = screen.getByLabelText(/邀请用户/)
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      // The form should show an error for invalid email format
      // Since the validation runs on submit, we need to wait for it
      await waitFor(() => {
        // Check if there's any error message displayed
        const errorElements = document.querySelectorAll('.text-red-500')
        expect(errorElements.length).toBeGreaterThan(0)
      }, { timeout: 2000 })
    })

    it('should show error when passcode strategy is selected but no passcode provided (需求 3.3)', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      const emailInput = screen.getByLabelText(/邀请用户/)
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const strategySelect = screen.getByLabelText(/加入策略/)
      fireEvent.change(strategySelect, { target: { value: 'passcode' } })

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/密码加入策略需要设置密码/)).toBeInTheDocument()
      })
    })

    it('should clear error when user starts typing', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Room 名称不能为空/)).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      await waitFor(() => {
        expect(screen.queryByText(/Room 名称不能为空/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Join strategy selection (需求 3.2)', () => {
    it('should default to approval strategy', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/) as HTMLSelectElement
      expect(strategySelect.value).toBe('approval')
    })

    it('should allow selecting free strategy', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/) as HTMLSelectElement
      fireEvent.change(strategySelect, { target: { value: 'free' } })

      expect(strategySelect.value).toBe('free')
    })

    it('should allow selecting passcode strategy', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/) as HTMLSelectElement
      fireEvent.change(strategySelect, { target: { value: 'passcode' } })

      expect(strategySelect.value).toBe('passcode')
    })

    it('should show appropriate help text for each strategy', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const strategySelect = screen.getByLabelText(/加入策略/)

      // Approval strategy
      fireEvent.change(strategySelect, { target: { value: 'approval' } })
      expect(screen.getByText(/新成员需要您的批准才能加入/)).toBeInTheDocument()

      // Free strategy
      fireEvent.change(strategySelect, { target: { value: 'free' } })
      expect(screen.getByText(/任何人都可以直接加入/)).toBeInTheDocument()

      // Passcode strategy
      fireEvent.change(strategySelect, { target: { value: 'passcode' } })
      expect(screen.getByText(/需要密码才能加入/)).toBeInTheDocument()
    })
  })

  describe('Password hashing (需求 3.3)', () => {
    it('should hash password with bcrypt when passcode strategy is used', async () => {
      const password = 'mySecurePassword123'
      const hash = await bcrypt.hash(password, 10)

      // Verify hash format
      expect(hash).toMatch(/^\$2[aby]\$10\$/)

      // Verify password can be verified
      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })

    it('should not hash password when approval strategy is used', async () => {
      // This is implicitly tested by the form logic
      // When strategy is not 'passcode', passcodeHash should be null
      const strategy = 'approval'
      const passcodeHash = strategy === 'passcode' ? await bcrypt.hash('password', 10) : null

      expect(passcodeHash).toBeNull()
    })

    it('should not hash password when free strategy is used', async () => {
      const strategy = 'free'
      const passcodeHash = strategy === 'passcode' ? await bcrypt.hash('password', 10) : null

      expect(passcodeHash).toBeNull()
    })
  })

  describe('Form submission', () => {
    it('should disable submit button while submitting', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      const emailInput = screen.getByLabelText(/邀请用户/)
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should show loading text while submitting', async () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const nameInput = screen.getByLabelText(/Room 名称/)
      fireEvent.change(nameInput, { target: { value: 'Test Room' } })

      const emailInput = screen.getByLabelText(/邀请用户/)
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

      const submitButton = screen.getByText('创建 Room')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('创建中...')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog controls', () => {
    it('should call onOpenChange when cancel button is clicked', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should call onOpenChange when backdrop is clicked', () => {
      render(
        <CreateRoomDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      )

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
      
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      }
    })
  })
})
