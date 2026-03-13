import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, ArrowLeft, Mail, FileDown, CheckCircle, AlertTriangle, User, Bot, List, Lock, Zap } from 'lucide-react';

export default function Investigate() {
    const [searchParams] = useSearchParams();
    const custId = searchParams.get('cust_id');
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingAlert, setSendingAlert] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailStatus, setEmailStatus] = useState(null);
    const [cardStatus, setCardStatus] = useState(null);
    const [blockingCard, setBlockingCard] = useState(null);
    const [freezingAccount, setFreezingAccount] = useState(false);
    const [actionStatus, setActionStatus] = useState(null);

    useEffect(() => {
        if (!custId) {
            setLoading(false);
            return;
        }

        axios.get(`/api/investigate/customer/${custId}`)
            .then(res => {
                setData(res.data);
                if (res.data && res.data.customer) {
                    setEmailInput(res.data.customer.email || '');
                }
                // Fetch card status
                axios.get(`/api/customer/card_status/${custId}`).then(r => setCardStatus(r.data)).catch(e => console.error(e));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [custId]);

    const downloadReport = async () => {
        try {
            const res = await axios.get(`/api/generate_customer_report/${custId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Investigation_Report_${custId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert("Failed to generate PDF Report");
        }
    };

    const sendEmail = async () => {
        if (!emailInput) return alert('Enter an email address');
        setSendingAlert(true);
        setEmailStatus({ type: 'loading', msg: 'Generating PDF and sending email...' });

        try {
            const r = await axios.post('/api/send_customer_alert', {
                customer_uuid: custId,
                recipient_email: emailInput
            });
            if (r.data.success) {
                setEmailStatus({ type: 'success', msg: `✅ Alert sent successfully to ${emailInput}` });
            } else {
                setEmailStatus({ type: 'error', msg: `❌ ${r.data.error}` });
            }
        } catch (e) {
            setEmailStatus({ type: 'error', msg: `❌ Server connection failed` });
        } finally {
            setSendingAlert(false);
        }
    };

    const blockCreditCard = async () => {
        setBlockingCard('credit');
        setActionStatus({ type: 'loading', msg: 'Blocking credit card...' });
        try {
            const res = await axios.post('/api/customer/block_credit_card', {
                customer_uuid: custId,
                reason: 'Critical transaction detected - Suspicious activity'
            });
            if (res.data.success) {
                setActionStatus({ type: 'success', msg: '✅ Credit card blocked successfully' });
                setCardStatus(prev => ({ ...prev, credit_card_status: 'BLOCKED' }));
            }
        } catch (e) {
            setActionStatus({ type: 'error', msg: '❌ Failed to block credit card' });
        }
        setTimeout(() => { setBlockingCard(null); setActionStatus(null); }, 3000);
    };

    const blockDebitCard = async () => {
        setBlockingCard('debit');
        setActionStatus({ type: 'loading', msg: 'Blocking debit card...' });
        try {
            const res = await axios.post('/api/customer/block_debit_card', {
                customer_uuid: custId,
                reason: 'Critical transaction detected - Suspicious activity'
            });
            if (res.data.success) {
                setActionStatus({ type: 'success', msg: '✅ Debit card blocked successfully' });
                setCardStatus(prev => ({ ...prev, debit_card_status: 'BLOCKED' }));
            }
        } catch (e) {
            setActionStatus({ type: 'error', msg: '❌ Failed to block debit card' });
        }
        setTimeout(() => { setBlockingCard(null); setActionStatus(null); }, 3000);
    };

    const freezeAccount = async () => {
        setFreezingAccount(true);
        setActionStatus({ type: 'loading', msg: 'Freezing account...' });
        try {
            const res = await axios.post('/api/customer/freeze_account', {
                customer_uuid: custId,
                reason: 'Critical transaction detected - Account security measure'
            });
            if (res.data.success) {
                setActionStatus({ type: 'success', msg: '✅ Account frozen successfully' });
                setCardStatus(prev => ({ ...prev, account_status: 'FROZEN' }));
            }
        } catch (e) {
            setActionStatus({ type: 'error', msg: '❌ Failed to freeze account' });
        }
        setTimeout(() => { setFreezingAccount(false); setActionStatus(null); }, 3000);
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-sec)' }}>
            <p>Compiling comprehensive customer report...</p>
        </div>
    );

    if (!custId || !data || data.error) return (
        <div style={{ padding: '40px' }}>
            <h1>Investigation Portal</h1>
            <p style={{ color: 'var(--text-dim)' }}>No customer selected. Please select a customer from the History tab.</p>
        </div>
    );

    const c = data.customer;
    const isCritical = data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH';

    const getRiskBg = (r) => {
        if (r === 'CRITICAL') return '#fef2f2';
        if (r === 'HIGH') return '#fff7ed';
        if (r === 'MEDIUM') return '#fffbeb';
        return '#f0fdf4';
    };
    const getRiskColor = (r) => {
        if (r === 'CRITICAL') return 'var(--red)';
        if (r === 'HIGH') return 'var(--orange)';
        if (r === 'MEDIUM') return '#d97706';
        return 'var(--green)';
    };
    const getRiskBorder = (r) => {
        if (r === 'CRITICAL') return '#fecaca';
        if (r === 'HIGH') return '#fed7aa';
        if (r === 'MEDIUM') return '#fde68a';
        return '#bbf7d0';
    };

    const formatCurrency = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const formatHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/^### (.*$)/gim, '<h3 style="font-size:16px;color:#0f172a;margin-top:20px;margin-bottom:10px">$1</h3>')
            .replace(/^## (.*$)/gim, '<h3 style="font-size:16px;color:#0f172a;margin-top:20px;margin-bottom:10px">$1</h3>')
            .replace(/^\*\*([^*]+)\*\*(.*)/gim, '<strong>$1</strong>$2')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br><br>');
    };

    return (
        <div className="dashboard">
            <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
                <button
                    onClick={() => navigate('/history')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', fontWeight: 600, fontSize: '13px', padding: '6px 14px', borderRadius: '7px', border: '1px solid var(--border)' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                {/* Header Card */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.5px' }}>{c.full_name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-dim)' }}>{c.customer_uuid}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: getRiskBg(data.risk_level), color: getRiskColor(data.risk_level), border: `1px solid ${getRiskBorder(data.risk_level)}`
                        }}>
                            {data.risk_level} RISK
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-sec)', marginTop: '8px' }}>
                            Risk Score: <strong style={{ color: 'inherit' }}>{data.overall_risk_score}</strong> / 10
                        </div>
                    </div>
                </div>

                {/* Customer Identity */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <User size={18} /> Customer Identity & Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>UPI ID</div><div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500 }}>{c.upi_id}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Bank</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{c.bank_name}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Account No.</div><div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500 }}>{c.account_number}</div></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Email</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{c.email || '—'}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Phone</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{c.registered_phone_number || '—'}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>KYC Status</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{c.kyc_status}</div></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Account Balance</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{formatCurrency(c.account_balance)}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Risk Tier (Bank)</div><div style={{ fontSize: '14px', fontWeight: 500 }}>{c.risk_tier}</div></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '.05em', marginBottom: '4px' }}>Total Anomalies</div><div style={{ color: 'var(--red)', fontWeight: 700, fontSize: '14px' }}>{data.all_anomalies_count}</div></div>
                        </div>
                    </div>
                </div>

                {/* AI Report Section */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <Bot size={18} /> AI Investigation Assessment
                    </h3>
                    <div
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', fontSize: '14px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: formatHtml(data.ai_report) }}
                    />
                </div>

                {/* Recent Transaction History */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <List size={18} /> Recent Transaction History
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Transaction ID</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Time</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Merchant</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Location</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Amount</th>
                                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: 'var(--text-sec)', borderBottom: '1px solid var(--border)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.all_customer_txns.map(t => {
                                    const isAnom = data.anomalies.some(a => a.transaction.transaction_uuid === t.transaction_uuid);
                                    return (
                                        <tr key={t.transaction_uuid} style={{ backgroundColor: isAnom ? '#fef2f2' : 'transparent' }}>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
                                                <code style={{ fontSize: '11px', color: isAnom ? 'var(--red)' : 'var(--text-sec)' }}>{t.transaction_uuid}</code>
                                                {isAnom && <span style={{ color: 'var(--red)', fontSize: '10px', fontWeight: 700, marginLeft: '6px' }}>⚠ FLAGGED</span>}
                                            </td>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>{t.transaction_timestamp}</td>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>{t.merchant_name}</td>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>{t.transaction_location}</td>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{formatCurrency(t.transaction_amount)}</td>
                                            <td style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>{t.transaction_status}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Critical Transactions - Only show if there are critical anomalies */}
                {data.critical_anomalies && data.critical_anomalies.length > 0 && (
                    <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '24px', border: '2px solid var(--red)', marginBottom: '24px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
                            <ShieldAlert size={20} /> Critical Transactions Detected
                        </h3>
                        
                        {/* Critical Transactions Flow */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            {data.critical_anomalies.map((anom, idx) => (
                                <div key={idx} style={{
                                    background: 'white',
                                    border: '2px solid #fecaca',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <div style={{
                                        background: 'var(--red)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        fontWeight: 700,
                                        fontSize: '14px'
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: '6px', fontSize: '14px' }}>
                                            {anom.detail}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Transaction ID:</span> <code style={{ color: 'var(--text-pri)' }}>{anom.transaction.transaction_uuid}</code></div>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Amount:</span> <span style={{ color: 'var(--red)', fontWeight: 700 }}>{formatCurrency(anom.transaction.transaction_amount)}</span></div>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Time:</span> {anom.transaction.transaction_timestamp}</div>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Merchant:</span> {anom.transaction.merchant_name || 'Unknown'}</div>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Location:</span> {anom.transaction.transaction_location}</div>
                                            <div><span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Risk Score:</span> <span style={{ color: 'var(--red)', fontWeight: 700 }}>{anom.risk_score}/10</span></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons - Only for Critical Risk Level */}
                        {(data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH') && (
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sec)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertTriangle size={16} /> Take Immediate Action
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <button
                                        onClick={blockCreditCard}
                                        disabled={blockingCard === 'credit' || cardStatus?.credit_card_status === 'BLOCKED'}
                                        style={{
                                            padding: '12px 16px',
                                            background: cardStatus?.credit_card_status === 'BLOCKED' ? '#e5e7eb' : 'var(--red)',
                                            color: cardStatus?.credit_card_status === 'BLOCKED' ? 'var(--text-sec)' : 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: cardStatus?.credit_card_status === 'BLOCKED' ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: blockingCard === 'credit' ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}>
                                        <Lock size={16} /> {cardStatus?.credit_card_status === 'BLOCKED' ? 'Credit Card Blocked' : blockingCard === 'credit' ? 'Blocking...' : 'Block Credit Card'}
                                    </button>

                                    <button
                                        onClick={blockDebitCard}
                                        disabled={blockingCard === 'debit' || cardStatus?.debit_card_status === 'BLOCKED'}
                                        style={{
                                            padding: '12px 16px',
                                            background: cardStatus?.debit_card_status === 'BLOCKED' ? '#e5e7eb' : 'var(--orange)',
                                            color: cardStatus?.debit_card_status === 'BLOCKED' ? 'var(--text-sec)' : 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: cardStatus?.debit_card_status === 'BLOCKED' ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: blockingCard === 'debit' ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}>
                                        <Lock size={16} /> {cardStatus?.debit_card_status === 'BLOCKED' ? 'Debit Card Blocked' : blockingCard === 'debit' ? 'Blocking...' : 'Block Debit Card'}
                                    </button>

                                    <button
                                        onClick={freezeAccount}
                                        disabled={freezingAccount || cardStatus?.account_status === 'FROZEN'}
                                        style={{
                                            padding: '12px 16px',
                                            background: cardStatus?.account_status === 'FROZEN' ? '#e5e7eb' : '#7c3aed',
                                            color: cardStatus?.account_status === 'FROZEN' ? 'var(--text-sec)' : 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: cardStatus?.account_status === 'FROZEN' ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: freezingAccount ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}>
                                        <Zap size={16} /> {cardStatus?.account_status === 'FROZEN' ? 'Account Frozen' : freezingAccount ? 'Freezing...' : 'Freeze Account'}
                                    </button>
                                </div>

                                {/* Action Status Message */}
                                {actionStatus && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: actionStatus.type === 'error' ? 'var(--red)' : actionStatus.type === 'success' ? '#16a34a' : 'var(--text-sec)',
                                        background: actionStatus.type === 'error' ? '#fef2f2' : actionStatus.type === 'success' ? '#f0fdf4' : '#f0f9ff'
                                    }}>
                                        {actionStatus.msg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setShowEmailModal(true)}
                        style={{ background: 'white', color: 'var(--text-pri)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} /> Email Alert to Customer
                    </button>
                    <button
                        onClick={downloadReport}
                        style={{ background: 'var(--pri-red)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileDown size={16} /> Generate PDF Summary
                    </button>
                </div>

                {/* Email Modal */}
                {showEmailModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowEmailModal(false) }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={18} /> Send Alert Email</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-sec)', marginBottom: '16px' }}>This will send an alert logically generated for the customer and attach the PDF investigation summary.</p>

                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', display: 'block', marginBottom: '6px' }}>Recipient Email</label>
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', marginBottom: '12px' }}
                            />

                            {emailStatus && (
                                <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '12px', color: emailStatus.type === 'error' ? 'var(--red)' : emailStatus.type === 'success' ? 'var(--green)' : 'var(--text-sec)' }}>
                                    {emailStatus.msg}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                                <button onClick={() => { setShowEmailModal(false); setEmailStatus(null); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button onClick={sendEmail} disabled={sendingAlert} style={{ padding: '8px 16px', background: 'var(--pri-red)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{sendingAlert ? 'Sending...' : 'Send Alert'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
