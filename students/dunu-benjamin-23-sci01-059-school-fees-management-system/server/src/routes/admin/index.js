import { Router } from 'express'
import { requireRole } from '../../middleware/auth.js'
import dashboard from './dashboard.js'
import students from './students.js'
import fees from './fees.js'
import payments from './payments.js'
import reports from './reports.js'
import system from './system.js'

const router = Router()

// Every admin endpoint requires an admin or superadmin session.
router.use(requireRole('admin', 'superadmin'))
router.use('/dashboard', dashboard)
router.use('/students', students)
router.use('/fees', fees)
router.use('/payments', payments)
router.use('/reports', reports)
router.use('/', system)

export default router
