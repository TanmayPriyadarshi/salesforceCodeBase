import { LightningElement, api, track, wire } from 'lwc';
import { publish, MessageContext } from 'lightning/messageService';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import {refreshApex} from '@salesforce/apex';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
// ...
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT = 'Ship it!';
const SUCCESS_VARIANT = 'success';
const ERROR_TITLE = 'Error';
const ERROR_VARIANT = 'error';
export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [];
  boatTypeId = '';
  @track boats;
  isLoading = false;
  @track draftValues = [];

  columns = [
    { label: 'Name', fieldName: 'Name', editable: true },
    { label: 'Length', fieldName: 'Length__c', type: 'number'},
    { label: 'Price', fieldName: 'Price__c', type: 'currency'},
    { label: 'Description', fieldName: 'Description__c'},        
    ];
  
  // wired message context
  @wire(MessageContext) messageContext;

@wire(getBoats,{boatTypeId:'$boatTypeId'})wiredBoats(result){
    this.boats = result;
    if(result.error){
        console.log(result.error);
    }
};
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api
  searchBoats(boatTypeId) {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    this.boatTypeId = boatTypeId;
   }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  @api
  async refresh() { 
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    await refreshApex(this.boats);
    this.isLoading = false;
    this.notifyLoading(this.isLoading);
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) { 
    console.log('inside updateSelectedTile=',event.detail);
    console.log('inside updateSelectedTile2=',event.detail.boatId);
    this.selectedBoatId = event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    publish(this.messageContext,BOATMC,{recordId : boatId});
  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    // notify loading
    const updatedFields = event.detail.draftValues;
    console.log('inside handleSave BoatSearchResults= ',updatedFields);
    // Update the records via Apex
    updateBoatList({data: updatedFields})
    .then((result) => {
        console.log('inside then=',JSON.parse(JSON.stringify(result)));
        const toast = new ShowToastEvent({
            title : SUCCESS_TITLE,
            message : MESSAGE_SHIP_IT,
            variant : SUCCESS_VARIANT
        });
        this.dispatchEvent(toast);
        this.draftValues = [];
        return this.refresh();
    })
    .catch(error => {
        console.log('inside catch1=',JSON.parse(JSON.stringify(error)));
        console.log('inside catch2=',error.essage);
        const toast = new ShowToastEvent({
            title : ERROR_TITLE,
            message : error.message,
            variant : ERROR_VARIANT
        });
        this.dispatchEvent(toast);
    })
    .finally(() => {});
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) { 
    if(isLoading){
        this.dispatchEvent(new CustomEvent('loading'));
    }
    else{
        this.dispatchEvent(new CustomEvent('doneloading'));
    }
  }
}
