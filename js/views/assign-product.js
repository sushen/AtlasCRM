import {renderCustomerSales} from './customer-sales.js';
import {inventoryFetch} from '../services/inventory-api.js';
export async function openAssignProduct(customer,{user,listPurchases,listSubscriptions,listProducts,recordPurchase,onSaved}={}){
  const modal=document.createElement('div');modal.className='modal-backdrop';
  modal.innerHTML='<div class="modal customer-profile" role="dialog" aria-modal="true" aria-labelledby="assign-product-title"><div class="modal-header"><h2 id="assign-product-title">Assign product to customer</h2><button class="button" data-close>Close</button></div><div class="modal-body" data-sales></div></div>';
  document.body.append(modal);modal.querySelector('[data-close]').onclick=()=>modal.remove();
  await renderCustomerSales(modal.querySelector('[data-sales]'),{customer,listPurchases,listSubscriptions,listProducts,recordPurchase,autoOpen:true,
    listInventory:async()=>(await inventoryFetch('/api/inventory/list',{user})).units,
    assignInventory:body=>inventoryFetch('/api/inventory/command',{user,body:{...body,action:'assign'}}),
    onSaved:async()=>{modal.remove();await onSaved?.();}});
}
