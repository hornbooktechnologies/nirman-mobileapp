'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { Arrow } from '@/components/site/Header'
import { validateContactField, validateContactFields, type ContactField, type ContactFieldErrors, type ContactFields } from '@/lib/contact/validation'

const FIELD =
  'mt-2 block w-full rounded-xl border border-coffee/[0.14] bg-paper px-4 text-[16px] font-medium text-coffee transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-muted/80 hover:border-coffee/25 focus:border-copper focus:bg-white focus:shadow-[0_0_0_4px_rgb(193_108_49/0.14)] focus:outline-none focus-visible:outline-none'
const LABEL = 'block text-[14px] font-bold text-coffee'
const BUTTON =
  'group inline-flex h-[54px] cursor-pointer items-center gap-2 rounded-full bg-copper-600 px-7 text-[15.5px] font-bold text-white transition-colors duration-200 hover:bg-[#96501e]'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({})

  function updateField(field: ContactField, value: string) {
    setFieldErrors(previous => previous[field] && !validateContactField(field, value)
      ? { ...previous, [field]: undefined }
      : previous)
    if (status !== 'sending') { setStatus('idle'); setFeedback('') }
  }

  function blurField(field: ContactField, value: string) {
    setFieldErrors(previous => ({ ...previous, [field]: validateContactField(field, value) }))
  }

  function errorClass(field: ContactField) {
    return fieldErrors[field] ? 'border-red-600 focus:border-red-600 focus:shadow-[0_0_0_4px_rgb(220_38_38/0.12)]' : ''
  }

  function fieldError(field: ContactField) {
    return fieldErrors[field] && <span id={`${field}-error`} className="mt-1.5 block text-[13px] font-medium text-red-700" role="alert">{fieldErrors[field]}</span>
  }

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('send')
    if (result === 'sent') {
      setStatus('sent')
      setFeedback('Your enquiry has been sent. Our team will contact you soon.')
    } else if (result === 'error') {
      setStatus('error')
      setFeedback('We could not send your enquiry. Please try again.')
    }
    if (result) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    const form = event.currentTarget
    const data = new FormData(form)
    const fields: ContactFields = {
      name: String(data.get('Full name') || ''), phone: String(data.get('Mobile number') || ''),
      email: String(data.get('Email address') || ''), message: String(data.get('Help requested') || ''),
    }
    const errors = validateContactFields(fields)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${{ name: 'Full name', phone: 'Mobile number', email: 'Email address', message: 'Help requested' }[Object.keys(errors)[0] as ContactField]}"]`)?.focus()
      return
    }
    setStatus('sending')
    setFeedback('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          website: data.get('website'),
        }),
      })
      const result = await response.json() as { ok?: boolean; error?: string; fieldErrors?: ContactFieldErrors; teamEmailSent?: boolean; confirmationEmailSent?: boolean }
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      if (!response.ok || !result.ok) throw new Error(result.error || 'We could not send your enquiry. Please try again.')
      form.reset()
      setFieldErrors({})
      setStatus('sent')
      setFeedback(result.teamEmailSent === false || result.confirmationEmailSent === false
        ? 'Your enquiry is saved in our system. Email delivery was unavailable, but our team can still contact you.'
        : 'Your enquiry has been sent. Please check your inbox for our confirmation email.')
    } catch (cause) {
      setStatus('error')
      setFeedback(cause instanceof Error ? cause.message : 'We could not send your enquiry. Please try again.')
    }
  }

  return (
    <div className="rounded-[28px] border border-coffee/[0.08] bg-white p-[clamp(22px,3.2vw,44px)] shadow-[0_40px_80px_-44px_rgb(42_33_27/0.45)]">
      <form method="post" action="/api/contact" noValidate onSubmit={submit}>
        <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: -9999 }}>
          <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={LABEL}>
            Full name <span className="text-copper-700">*</span>
            <input name="Full name" autoComplete="name" required maxLength={100} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined} onChange={event => updateField('name', event.target.value)} onBlur={event => blurField('name', event.target.value)} className={`${FIELD} h-[52px] ${errorClass('name')}`} />
            {fieldError('name')}
          </label>
          <label className={LABEL}>
            Mobile number <span className="text-copper-700">*</span>
            <input name="Mobile number" type="tel" inputMode="tel" autoComplete="tel" required maxLength={25} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} onChange={event => updateField('phone', event.target.value)} onBlur={event => blurField('phone', event.target.value)} className={`${FIELD} h-[52px] ${errorClass('phone')}`} />
            {fieldError('phone')}
          </label>
          <label className={`${LABEL} sm:col-span-2`}>
            Email address <span className="text-copper-700">*</span>
            <input name="Email address" type="email" autoComplete="email" required maxLength={150} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} onChange={event => updateField('email', event.target.value)} onBlur={event => blurField('email', event.target.value)} className={`${FIELD} h-[52px] ${errorClass('email')}`} />
            {fieldError('email')}
          </label>
          <label className={`${LABEL} sm:col-span-2`}>
            What would you like help with?
            <textarea
              name="Help requested"
              rows={3}
              maxLength={1000}
              aria-invalid={!!fieldErrors.message}
              aria-describedby={fieldErrors.message ? 'message-error' : undefined}
              onChange={event => updateField('message', event.target.value)}
              onBlur={event => blurField('message', event.target.value)}
              placeholder="Tell us briefly what you would like to simplify. Please do not include sensitive records."
              className={`${FIELD} min-h-[128px] resize-y py-3.5 leading-relaxed ${errorClass('message')}`}
            />
            {fieldError('message')}
          </label>
        </div>
        <p className="mt-5 text-[13.5px] font-medium leading-relaxed text-muted">
          Submitting this form saves your details in our enquiry system and notifies our team by email. By sending it, you agree that our team may contact you. Read the{' '}
          <Link href="/privacy" className="font-bold text-copper-700 underline decoration-copper/40 underline-offset-2 hover:decoration-copper">
            Privacy Policy
          </Link>
          .
        </p>
        <button className={`${BUTTON} mt-7 disabled:cursor-wait disabled:opacity-60`} type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send enquiry'}
          <Arrow className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
        {feedback && (
          <div className={`mt-6 rounded-[20px] border p-5 text-[15px] font-medium leading-relaxed ${status === 'sent' ? 'border-olive/25 bg-sage text-coffee' : 'border-copper/25 bg-paper text-coffee'}`} role={status === 'error' ? 'alert' : 'status'}>
            {feedback}
            {status === 'error' && <span> You can also write to <a className="font-bold underline" href="mailto:contact@hornbooktechnologies.com">contact@hornbooktechnologies.com</a>.</span>}
          </div>
        )}
      </form>
    </div>
  )
}
