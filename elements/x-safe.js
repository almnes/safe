import XElement from '/libraries/x-element/x-element.js';
import XRouter from '/elements/x-router/x-router.js';
import XAccounts from '/elements/x-accounts/x-accounts.js';
import XTransactions from '/elements/x-transactions/x-transactions.js';
import accountManager from '/libraries/account-manager/account-manager.js';
import networkClient from '../network-client.js';
import { addAccount } from '/elements/x-accounts/accounts-redux.js';
import MixinRedux from '/elements/mixin-redux/mixin-redux.js';
import XTotalAmount from './x-total-amount.js';
import XWalletBackupImportModal from '/elements/x-wallet-backup-import/x-wallet-backup-import-modal.js';
import XNetworkIndicator from '/elements/x-network-indicator/x-network-indicator.js';
import XSendTransactionModal from '/elements/x-send-transaction/x-send-transaction-modal.js';
import XSendTransactionPlainConfirmModal from '/elements/x-send-transaction/x-send-transaction-plain-confirm-modal.js';
import XToast from '/elements/x-toast/x-toast.js';

export default class XSafe extends MixinRedux(XElement) {

    html() {
        return `
            <header>
                <div class="header-top">
                    <div class="nimiq-app-name">
                        <nimiq-logo>NIMIQ <strong>SAFE</strong></nimiq-logo>
                    </div>
                    <nav class="secondary-links">
                        <a href="https://nimiq.com">Homepage</a>
                        <a href="https://nimiq.com/explorer">Explorer</a>
                    </nav>
                </div>
                <x-total-amount></x-total-amount>
                <div class="header-bottom">
                    <nav class="main"></nav>
                    <nav class="actions">
                        <button class="small" new-tx>New Tx</button>
                    </nav>
                </div>
            </header>
            <section class="content nimiq-dark">
                <x-router>
                    <x-import-file x-route="import-from-file"> Import via backup file</x-import-file>
                    <main x-route="sign"> New Transaction</main>
                    <main x-route="vesting"> Vesting contracts</main>
                    <x-view-dashboard x-route="">
                        <x-card>
                            <h2>Recent Transactions</h2>
                            <x-transactions></x-transactions>
                        </x-card>
                        <x-card style="max-width: 512px;">
                            <h2>Your Accounts</h2>
                            <x-accounts></x-accounts>
                        </x-card>
                        <x-card style="max-width: 400px;">
                            <h2>Network Status</h2>
                            <x-network-indicator></x-network-indicator>
                        </x-card>
                    </x-view-dashboard>
                    <x-view-transactions x-route="transactions"></x-view-transactions>
                    <x-view-settings x-route="settings"></x-view-settings>
                </x-router>
            </section>
            <footer class="nimiq-dark>
                &copy; 2017-2018 Nimiq Foundation
            </footer>
            `
    }

    children() {
        return [ XTotalAmount, XRouter, XAccounts, XTransactions, XNetworkIndicator ];
    }

    static get actions() {
        return { addAccount };
    }

    listeners() {
        return {
            'x-accounts-create': () => accountManager.create(),
            'x-accounts-import': () => accountManager.import(),
            'click button[new-tx]': this._clickedNewTransaction.bind(this),
            'x-send-transaction': this._signTransaction.bind(this),
            'x-send-transaction-confirm': this._sendTransactionNow.bind(this),
            'x-account-modal-new-tx': this._clickedNewTransaction.bind(this),
            'x-account-modal-export': (a) => accountManager.export(a),
            'x-account-modal-rename': (a) => accountManager.rename(a)
        }
    }

    static mapStateToProps(state) {
        return {
            height: state.network.height
        }
    }

    _clickedNewTransaction(account) {
        XSendTransactionModal.instance.clear(this.properties.height);
        account && XSendTransactionModal.instance.setSelectedSender(account);
        XSendTransactionModal.show();
    }

    async _signTransaction(tx) {
        tx.value = Number(tx.value);
        tx.fee = Number(tx.fee) || 0;
        tx.validityStartHeight = parseInt(tx.validityStartHeight) || this.properties.height;
        tx.recipient = 'NQ' + tx.recipient;

        const signedTx = await accountManager.sign(tx);

        // Show textform TX to the user and require explicit click on the "SEND NOW" button
        XSendTransactionPlainConfirmModal.instance.transaction = signedTx;
        XSendTransactionPlainConfirmModal.show();
    }

    async _sendTransactionNow(signedTx) {
        if (!signedTx) return;

        const network = (await networkClient).rpcClient;
        try {
            await network.relayTransaction(signedTx);
        } catch(e) {
            XToast.show(e.message);
            return;
        }

        XSendTransactionPlainConfirmModal.instance.sent();
        XSendTransactionPlainConfirmModal.hide();

        XToast.show('Sent transaction');
    }
}

// TODO catch errors in a top level error panel catching all previously uncaught exceptions > XApp?
